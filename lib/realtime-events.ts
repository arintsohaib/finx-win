
// Real-time event emitter for instant synchronization between admin and users
// Uses in-memory event system for instant updates

type EventListener = (data: any) => void;

interface EventMetrics {
  emitCount: number;
  lastEmitTime: number | null;
  listenerCount: number;
  averageDeliveryTime: number;
  failedDeliveries: number;
}

// Trade settlement event data structure
export interface TradeSettlementEvent {
  tradeId: string;
  walletAddress: string;
  status: 'finished';
  outcome: string;
  pnl: number;
  settledAt: string;
}

class RealtimeEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private metrics: Map<string, EventMetrics> = new Map();
  private eventQueue: Array<{ event: string; data: any; timestamp: number }> = [];
  private readonly MAX_QUEUE_SIZE = 100;

  subscribe(event: string, listener: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      this.initializeMetrics(event);
    }
    this.listeners.get(event)!.add(listener);
    this.updateListenerCount(event);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        this.updateListenerCount(event);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
          this.metrics.delete(event);
        }
      }
    };
  }

  emit(event: string, data: any) {
    const startTime = Date.now();
    const eventListeners = this.listeners.get(event);
    
    if (!this.metrics.has(event)) {
      this.initializeMetrics(event);
    }
    
    const metrics = this.metrics.get(event)!;
    metrics.emitCount++;
    metrics.lastEmitTime = startTime;

    if (eventListeners && eventListeners.size > 0) {
      let successCount = 0;
      let failCount = 0;

      eventListeners.forEach((listener: any) => {
        try {
          listener(data);
          successCount++;
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
          failCount++;
          metrics.failedDeliveries++;
        }
      });

      // Update delivery time metrics
      const deliveryTime = Date.now() - startTime;
      metrics.averageDeliveryTime = 
        (metrics.averageDeliveryTime * (metrics.emitCount - 1) + deliveryTime) / metrics.emitCount;

      // Log performance for critical events
      if (event.includes('notification') || event.includes('trade')) {
        console.log(`[Realtime Events] ${event}: delivered to ${successCount}/${eventListeners.size} listeners in ${deliveryTime}ms`);
      }
    } else {
      // No listeners, queue the event for potential future delivery
      this.queueEvent(event, data, startTime);
      console.warn(`[Realtime Events] No listeners for ${event}, event queued`);
    }
  }

  private queueEvent(event: string, data: any, timestamp: number) {
    this.eventQueue.push({ event, data, timestamp });
    
    // Maintain max queue size (FIFO)
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      const removed = this.eventQueue.shift();
      console.warn(`[Realtime Events] Queue full, dropped oldest event: ${removed?.event}`);
    }
  }

  private initializeMetrics(event: string) {
    this.metrics.set(event, {
      emitCount: 0,
      lastEmitTime: null,
      listenerCount: 0,
      averageDeliveryTime: 0,
      failedDeliveries: 0,
    });
  }

  private updateListenerCount(event: string) {
    const metrics = this.metrics.get(event);
    const listeners = this.listeners.get(event);
    if (metrics && listeners) {
      metrics.listenerCount = listeners.size;
    }
  }

  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  getMetrics(event?: string): EventMetrics | Map<string, EventMetrics> {
    if (event) {
      return this.metrics.get(event) || {
        emitCount: 0,
        lastEmitTime: null,
        listenerCount: 0,
        averageDeliveryTime: 0,
        failedDeliveries: 0,
      };
    }
    return new Map(this.metrics);
  }

  getQueuedEvents(): Array<{ event: string; data: any; timestamp: number }> {
    return [...this.eventQueue];
  }

  clearQueue() {
    const clearedCount = this.eventQueue.length;
    this.eventQueue = [];
    console.log(`[Realtime Events] Cleared ${clearedCount} queued events`);
  }

  // Diagnostic method for monitoring
  printMetrics() {
    console.log('[Realtime Events] Performance Metrics:');
    this.metrics.forEach((metrics: any, event: any) => {
      if (metrics.emitCount > 0) {
        console.log(`  ${event}:`, {
          emits: metrics.emitCount,
          listeners: metrics.listenerCount,
          avgDeliveryTime: `${metrics.averageDeliveryTime.toFixed(2)}ms`,
          failures: metrics.failedDeliveries,
          successRate: `${(((metrics.emitCount - metrics.failedDeliveries) / metrics.emitCount) * 100).toFixed(1)}%`
        });
      }
    });
  }
}

// Global singleton instance
export const realtimeEvents = new RealtimeEventEmitter();

// Event types for type safety
export const REALTIME_EVENTS = {
  // Admin events
  DEPOSIT_CREATED: 'deposit:created',
  DEPOSIT_UPDATED: 'deposit:updated',
  WITHDRAWAL_CREATED: 'withdrawal:created',
  WITHDRAWAL_UPDATED: 'withdrawal:updated',
  TRADE_CREATED: 'trade:created',
  TRADE_UPDATED: 'trade:updated',
  TRADE_SETTLED: 'trade:settled',  // NEW: Instant trade settlement notification
  CONVERSION_CREATED: 'conversion:created',
  KYC_SUBMITTED: 'kyc:submitted',
  KYC_UPDATED: 'kyc:updated',
  
  // Activity events (for Live Overview)
  ACTIVITY_CREATED: 'activity:created',
  
  // User events
  USER_BALANCE_UPDATED: 'user:balance:updated',
  USER_NOTIFICATION: 'user:notification',
} as const;
