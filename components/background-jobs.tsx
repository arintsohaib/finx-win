
'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

// Time-based adaptive intervals (in milliseconds)
const ACTIVE_HOURS_INTERVAL = 1500;  // 1.5 seconds during active hours (9 AM - 11 PM)
const OFF_HOURS_INTERVAL = 1500;      // 1.5 seconds during off-hours
const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential backoff for retries
const MAX_CONSECUTIVE_FAILURES = 3;

export function BackgroundJobs() {
  const { isConnected } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const currentRetryDelayIndexRef = useRef(0);
  const performanceMetricsRef = useRef<{
    lastSettlementTime: number | null;
    averageSettlementTime: number;
    settlementCount: number;
    failureCount: number;
  }>({
    lastSettlementTime: null,
    averageSettlementTime: 0,
    settlementCount: 0,
    failureCount: 0,
  });

  // Determine if we're in active trading hours
  const isActiveHours = (): boolean => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour < 23; // 9 AM to 11 PM
  };

  // Get adaptive interval based on time and recent failures
  const getAdaptiveInterval = (): number => {
    if (consecutiveFailuresRef.current > 0) {
      const retryDelay = RETRY_DELAYS[Math.min(currentRetryDelayIndexRef.current, RETRY_DELAYS.length - 1)];
      return retryDelay;
    }
    return isActiveHours() ? ACTIVE_HOURS_INTERVAL : OFF_HOURS_INTERVAL;
  };

  // Log performance metrics
  const logPerformanceMetrics = () => {
    const metrics = performanceMetricsRef.current;
    if (metrics.settlementCount > 0) {
      console.log('[Background Jobs] Performance Metrics:', {
        averageSettlementTime: `${metrics.averageSettlementTime.toFixed(0)}ms`,
        totalSettlements: metrics.settlementCount,
        failureCount: metrics.failureCount,
        successRate: `${((metrics.settlementCount / (metrics.settlementCount + metrics.failureCount)) * 100).toFixed(1)}%`
      });
    }
  };

  useEffect(() => {
    if (!isConnected) {
      // Clear interval if user disconnects
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to settle trades with performance tracking
    const settleTrades = async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/trades/settle', {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Update performance metrics
        const metrics = performanceMetricsRef.current;
        metrics.settlementCount++;
        metrics.lastSettlementTime = duration;
        metrics.averageSettlementTime = 
          (metrics.averageSettlementTime * (metrics.settlementCount - 1) + duration) / metrics.settlementCount;

        // Reset failure counters on success
        if (consecutiveFailuresRef.current > 0) {
          console.log('[Background Jobs] Settlement recovered after failures');
          consecutiveFailuresRef.current = 0;
          currentRetryDelayIndexRef.current = 0;
        }

        // Log if settlements were made
        if (data.settledCount > 0) {
          console.log(`[Background Jobs] Settled ${data.settledCount} trade(s) in ${duration}ms`);
        }

        // Log metrics every 10 settlements
        if (metrics.settlementCount % 10 === 0) {
          logPerformanceMetrics();
        }

      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        consecutiveFailuresRef.current++;
        performanceMetricsRef.current.failureCount++;
        
        console.error(`[Background Jobs] Settlement failed (${duration}ms):`, error);
        
        // Increase retry delay on consecutive failures
        if (consecutiveFailuresRef.current > 1) {
          currentRetryDelayIndexRef.current = Math.min(
            currentRetryDelayIndexRef.current + 1,
            RETRY_DELAYS.length - 1
          );
        }

        // Alert if too many consecutive failures
        if (consecutiveFailuresRef.current === MAX_CONSECUTIVE_FAILURES) {
          console.error(`[Background Jobs] CRITICAL: ${MAX_CONSECUTIVE_FAILURES} consecutive failures detected`);
        }
      }

      // Reschedule with adaptive interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      const nextInterval = getAdaptiveInterval();
      intervalRef.current = setInterval(settleTrades, nextInterval);
      
      // Log interval changes
      const intervalType = consecutiveFailuresRef.current > 0 
        ? `retry (${nextInterval}ms)` 
        : isActiveHours() 
          ? `active hours (${nextInterval}ms)` 
          : `off hours (${nextInterval}ms)`;
      
      if (consecutiveFailuresRef.current > 0 || performanceMetricsRef.current.settlementCount % 10 === 0) {
        console.log(`[Background Jobs] Next check in ${nextInterval}ms [${intervalType}]`);
      }
    };

    // Initial settlement
    console.log('[Background Jobs] Starting trade settlement service');
    settleTrades();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log('[Background Jobs] Stopped trade settlement service');
      logPerformanceMetrics();
    };
  }, [isConnected]);

  return null; // This component doesn't render anything
}
