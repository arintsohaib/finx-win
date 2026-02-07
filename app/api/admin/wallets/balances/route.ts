export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminAuth } from '@/lib/admin-auth';
export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin authentication
    const admin = await verifyAdminAuth(req);
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    // 2. Get walletAddress from query params
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter is required' },
        { status: 400 }
      );
    }

    // 3. Verify user exists
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { walletAddress: true, uid: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Fetch all balances for the user
    const balances = await prisma.balance.findMany({
      where: { walletAddress },
      select: {
        currency: true,
        amount: true,
        realBalance: true,
        realWinnings: true,
        frozenBalance: true,
        updatedAt: true,
      },
      orderBy: {
        currency: 'asc',
      },
    });

    // 5. Return balances
    return NextResponse.json({
      success: true,
      balances: balances.map((b: any) => ({
        currency: b.currency,
        amount: b.amount.toString(),
        realBalance: b.realBalance.toString(),
        realWinnings: b.realWinnings.toString(),
        frozenBalance: b.frozenBalance.toString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    });

  } catch (error: any) {
    console.error('Error fetching user balances:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
