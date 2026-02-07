

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface RealtimeUserEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

interface PerformanceMetrics {
  sseConnectionAttempts: number;
  sseSuccessfulConnections: number;
  pollingRequests: number;
  averageLatency: number;
  eventCount: number;
  lastEventTime: number | null;
}

/**
 * Custom hook for user-specific real-time updates
 * Primary: SSE (Server-Sent Events) for real-time push
 * Fallback: HTTP polling when SSE fails
 */
export function useRealtimeUser() {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeUserEvent | null>(null);
  const [connectionMode, setConnectionMode] = useState<'sse' | 'polling'>('sse');
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const walletAddressRef = useRef<string | undefined>(undefined);
  const isMountedRef = useRef(true);
  const sseFailureCountRef = useRef(0);
  const lastPollTimeRef = useRef<number>(Date.now());
  
  const metricsRef = useRef<PerformanceMetrics>({
    sseConnectionAttempts: 0,
    sseSuccessfulConnections: 0,
    pollingRequests: 0,
    averageLatency: 0,
    eventCount: 0,
    lastEventTime: null,
  });

  const MAX_SSE_FAILURES = 3;
  const POLLING_INTERVAL = 5000; // 5 seconds
  const SSE_RETRY_DELAY = 5000; // 5 seconds

  // Process received events (common for both SSE and polling)
  const processEvent = useCallback((data: any) => {
    if (!isMountedRef.current) return;

    try {
      // Skip keep-alive pings
      if (!data.type || data.type === 'connected') {
        return;
      }

      const now = Date.now();
      const metrics = metricsRef.current;
      
      // Update metrics
      metrics.eventCount++;
      metrics.lastEventTime = now;

      console.log(`[Realtime User ${connectionMode.toUpperCase()}] Received event:`, data.type);
      setLastEvent(data);

      // Notify type-specific listeners
      const listeners = listenersRef.current.get(data.type);
      if (listeners) {
        listeners.forEach((listener: any) => {
          try {
            listener(data.data);
          } catch (error) {
            console.error('[Realtime User] Error in listener:', error);
          }
        });
      }

      // Also notify wildcard listeners
      const wildcardListeners = listenersRef.current.get('*');
      if (wildcardListeners) {
        wildcardListeners.forEach((listener: any) => {
          try {
            listener(data);
          } catch (error) {
            console.error('[Realtime User] Error in wildcard listener:', error);
          }
        });
      }
    } catch (error) {
      console.error('[Realtime User] Error processing event:', error);
    }
  }, [connectionMode]);

  // HTTP Polling fallback
  const startPolling = useCallback((walletAddress: string) => {
    console.log('[Realtime User] Starting HTTP polling fallback');
    setConnectionMode('polling');
    setIsConnected(true);

    const poll = async () => {
      if (!isMountedRef.current || walletAddressRef.current !== walletAddress) return;

      const startTime = Date.now();
      const metrics = metricsRef.current;
      metrics.pollingRequests++;

      try {
        const response = await fetch(`/api/realtime/poll/${walletAddress}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const latency = Date.now() - startTime;
          
          // Update average latency
          metrics.averageLatency = 
            (metrics.averageLatency * (metrics.pollingRequests - 1) + latency) / metrics.pollingRequests;

          // Process any events
          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event: any) => processEvent(event));
          }

          lastPollTimeRef.current = Date.now();
        } else {
          console.error('[Realtime User] Polling request failed:', response.status);
        }
      } catch (error) {
        console.error('[Realtime User] Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
  }, [processEvent]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[Realtime User] Stopped HTTP polling');
    }
  }, []);

  // SSE connection
  const connectSSE = useCallback((walletAddress: string) => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPolling();

    const metrics = metricsRef.current;
    metrics.sseConnectionAttempts++;

    try {
      console.log('[Realtime User] Attempting SSE connection...');
      const eventSource = new EventSource(`/api/realtime/user/${walletAddress}`);
      eventSourceRef.current = eventSource;
      setConnectionMode('sse');

      eventSource.onopen = () => {
        if (isMountedRef.current) {
          console.log('[Realtime User] SSE Connected successfully');
          setIsConnected(true);
          sseFailureCountRef.current = 0; // Reset failure count on success
          metrics.sseSuccessfulConnections++;
        }
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          processEvent(data);
        } catch (error) {
          console.error('[Realtime User] Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        console.log('[Realtime User] SSE Connection error');
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        sseFailureCountRef.current++;

        // Switch to polling if SSE fails repeatedly
        if (sseFailureCountRef.current >= MAX_SSE_FAILURES) {
          console.warn(`[Realtime User] SSE failed ${MAX_SSE_FAILURES} times, switching to HTTP polling`);
          if (isMountedRef.current && walletAddressRef.current === walletAddress) {
            startPolling(walletAddress);
          }
        } else {
          // Retry SSE with exponential backoff
          if (isMountedRef.current && walletAddressRef.current === walletAddress) {
            const retryDelay = SSE_RETRY_DELAY * Math.pow(2, sseFailureCountRef.current - 1);
            console.log(`[Realtime User] Retrying SSE in ${retryDelay}ms (attempt ${sseFailureCountRef.current}/${MAX_SSE_FAILURES})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && walletAddressRef.current === walletAddress) {
                connectSSE(walletAddress);
              }
            }, retryDelay);
          }
        }
      };
    } catch (error) {
      console.error('[Realtime User] Error creating EventSource:', error);
      
      // Fallback to polling immediately on SSE creation error
      if (isMountedRef.current && walletAddressRef.current === walletAddress) {
        startPolling(walletAddress);
      }
    }
  }, [processEvent, startPolling, stopPolling]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      // CRITICAL FIX: Remove event listeners before closing to prevent memory leaks
      eventSourceRef.current.onopen = null;
      eventSourceRef.current.onmessage = null;
      eventSourceRef.current.onerror = null;
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();
    
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, [stopPolling]);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const reconnect = useCallback(() => {
    if (walletAddressRef.current) {
      disconnect();
      sseFailureCountRef.current = 0; // Reset failure count on manual reconnect
      connectSSE(walletAddressRef.current);
    }
  }, [connectSSE, disconnect]);

  // Get performance metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const currentWalletAddress = user?.walletAddress;
    
    // Only connect/reconnect if wallet address changed
    if (currentWalletAddress !== walletAddressRef.current) {
      // Disconnect previous connection if exists
      disconnect();
      
      // Update ref and connect with new wallet address
      walletAddressRef.current = currentWalletAddress;
      
      if (currentWalletAddress) {
        console.log('[Realtime User] Connecting with wallet:', currentWalletAddress);
        connectSSE(currentWalletAddress);
      } else {
        console.log('[Realtime User] No wallet address, skipping connection');
      }
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [user?.walletAddress, connectSSE, disconnect]);

  return {
    isConnected,
    lastEvent,
    subscribe,
    reconnect,
    connectionMode,
    getMetrics,
  };
}
