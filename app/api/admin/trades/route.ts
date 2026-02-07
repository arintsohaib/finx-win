export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
    // Fetch active trades with user information including UID
    const trades = await prisma.trade.findMany({
      where: { status: 'active' },
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Transform to include UID prominently
    const tradesWithUID = trades.map((trade: any) => ({
      ...trade,
      uid: trade.user.uid,
      userDisplay: `UID-${trade.user.uid} | ${trade.walletAddress.slice(0, 6)}...${trade.walletAddress.slice(-4)}`,
    }));

    return NextResponse.json({ trades: tradesWithUID });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
