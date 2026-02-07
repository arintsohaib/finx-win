export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
export async function GET(req: NextRequest, context: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await context.params;

    // Find user by UID
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        walletAddress: true,
        uid: true,
        kycStatus: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get KYC info if approved
    let kycInfo = null;
    if (user.kycStatus === 'approved') {
      const kycSubmission = await prisma.kYCSubmission.findFirst({
        where: {
          walletAddress: user.walletAddress,
          status: 'approved',
        },
        select: {
          fullName: true,
          email: true,
        },
      });
      kycInfo = kycSubmission;
    }

    // Get active trades
    const activeTrades = await prisma.trade.findMany({
      where: {
        walletAddress: user.walletAddress,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get last 5 finished trades
    const finishedTrades = await prisma.trade.findMany({
      where: {
        walletAddress: user.walletAddress,
        status: 'finished',
      },
      orderBy: { closedAt: 'desc' },
      take: 5,
    });

    // Get balances
    const balances = await prisma.balance.findMany({
      where: { walletAddress: user.walletAddress },
    });

    return NextResponse.json({
      user: {
        ...user,
        fullName: kycInfo?.fullName,
        email: kycInfo?.email,
      },
      activeTrades,
      finishedTrades,
      balances,
    });
  } catch (error) {
    console.error('[Admin User Details API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

