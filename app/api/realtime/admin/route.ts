export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
// SSE endpoint for admin real-time updates
export async function GET(req: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Subscribe to all admin-relevant events
      const unsubscribers: Array<() => void> = [];

      // Deposits
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.DEPOSIT_CREATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'deposit:created', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.DEPOSIT_UPDATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'deposit:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Withdrawals
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.WITHDRAWAL_CREATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'withdrawal:created', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.WITHDRAWAL_UPDATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'withdrawal:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Trades
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.TRADE_CREATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'trade:created', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.TRADE_UPDATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'trade:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Conversions
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.CONVERSION_CREATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'conversion:created', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // KYC
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.KYC_SUBMITTED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'kyc:submitted', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.KYC_UPDATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'kyc:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Activity (for Live Overview)
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.ACTIVITY_CREATED, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'activity:created', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Keep-alive ping every 15 seconds
      const keepAliveInterval = setInterval(() => {
        if (isConnected) {
          const ping = `: keep-alive ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(ping));
        }
      }, 15000);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        isConnected = false;
        clearInterval(keepAliveInterval);
        unsubscribers.forEach((unsubscribe: any) => unsubscribe());
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}

export const runtime = 'nodejs';
