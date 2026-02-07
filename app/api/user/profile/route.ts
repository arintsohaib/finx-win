export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserBalances } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user balances
    const balances = await getUserBalances(payload.walletAddress);

    // Get detailed balance information
    const balanceRecords = await prisma.balance.findMany({
      where: { walletAddress: payload.walletAddress }
    });
    
    const balanceDetails: Record<string, any> = {};
    balanceRecords.forEach((balance: any) => {
      balanceDetails[balance.currency] = {
        total: (parseFloat(balance.realBalance.toString()) + 
                parseFloat(balance.realWinnings.toString())).toFixed(8),
        realBalance: balance.realBalance.toString(),
        realWinnings: balance.realWinnings.toString(),
        frozenBalance: balance.frozenBalance.toString()
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        uid: user.uid,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        balances,
        balanceDetails
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
