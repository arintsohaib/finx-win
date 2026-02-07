export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
// SSE endpoint for user-specific real-time updates
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ walletAddress: string }> }
) {
  const { walletAddress } = await context.params;

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      const unsubscribers: Array<() => void> = [];

      // Subscribe to user-specific events
      unsubscribers.push(realtimeEvents.subscribe(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${walletAddress}`, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'balance:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(`${REALTIME_EVENTS.USER_NOTIFICATION}:${walletAddress}`, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'notification', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(`${REALTIME_EVENTS.DEPOSIT_UPDATED}:${walletAddress}`, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'deposit:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      unsubscribers.push(realtimeEvents.subscribe(`${REALTIME_EVENTS.WITHDRAWAL_UPDATED}:${walletAddress}`, (data) => {
        if (isConnected) {
          const message = `data: ${JSON.stringify({ type: 'withdrawal:updated', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // ✨ NEW: Instant trade settlement notification
      unsubscribers.push(realtimeEvents.subscribe(REALTIME_EVENTS.TRADE_SETTLED, (data) => {
        // Only forward if the trade belongs to this wallet
        if (isConnected && data.walletAddress === walletAddress) {
          const message = `data: ${JSON.stringify({ type: 'trade:settled', data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      }));

      // Keep-alive ping
      const keepAliveInterval = setInterval(() => {
        if (isConnected) {
          const ping = `: keep-alive ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(ping));
        }
      }, 15000);

      // Cleanup
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
