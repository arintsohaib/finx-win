
import { useEffect, useState, useCallback, useRef } from 'react';

export interface RealtimeEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

export function useRealtimeAdmin() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);

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
    if (isMountedRef.current) {
      setIsConnected(false);
    }
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || eventSourceRef.current) {
      return;
    }

    isConnectingRef.current = true;

    // Clean up any existing timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const eventSource = new EventSource('/api/realtime/admin');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (isMountedRef.current) {
          console.log('[Realtime Admin] Connected');
          setIsConnected(true);
          isConnectingRef.current = false;
        }
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          
          // Skip keep-alive pings
          if (!data.type) {
            return;
          }

          setLastEvent(data);

          // Notify listeners
          const listeners = listenersRef.current.get(data.type);
          if (listeners) {
            listeners.forEach((listener: any) => {
              try {
                listener(data.data);
              } catch (error) {
                console.error('[Realtime Admin] Error in listener:', error);
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
                console.error('[Realtime Admin] Error in wildcard listener:', error);
              }
            });
          }
        } catch (error) {
          console.error('[Realtime Admin] Error parsing event:', error);
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        console.log('[Realtime Admin] Connection error, reconnecting...');
        setIsConnected(false);
        isConnectingRef.current = false;
        eventSource.close();
        eventSourceRef.current = null;

        // Only reconnect if still mounted
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[Realtime Admin] Error creating EventSource:', error);
      isConnectingRef.current = false;
    }
  }, []);

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
    disconnect();
    setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial connection
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    lastEvent,
    subscribe,
    reconnect,
  };
}
