export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * HTTP Polling endpoint as fallback for SSE
 * Returns recent notifications and balance changes
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const { walletAddress } = await context.params;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Get timestamp from query (for incremental updates)
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam ? new Date(parseInt(sinceParam)) : new Date(Date.now() - 30000); // Last 30 seconds by default

    // Fetch recent notifications
    const notifications = await prisma.notification.findMany({
      where: {
        walletAddress,
        createdAt: {
          gt: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Fetch recent balance updates (by checking if balance was updated recently)
    const balance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress,
          currency: 'USDT',
        },
      },
      select: {
        amount: true,
        updatedAt: true,
      },
    });

    const events: any[] = [];

    // Add notification events
    notifications.forEach((notification: any) => {
      events.push({
        type: 'notification',
        data: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          tradeId: notification.tradeId,
          createdAt: notification.createdAt.toISOString(),
        },
        timestamp: notification.createdAt.getTime(),
      });
    });

    // Add balance update event if balance was recently updated
    if (balance && balance.updatedAt > since) {
      events.push({
        type: 'balance:updated',
        data: {
          walletAddress,
          amount: balance.amount.toString(),
          updatedAt: balance.updatedAt.toISOString(),
        },
        timestamp: balance.updatedAt.getTime(),
      });
    }

    return NextResponse.json({
      events,
      count: events.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Polling API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates', events: [] },
      { status: 500 }
    );
  }
}
