export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserBalances } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    // Get full user info from database
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress }
    });

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    // Get user balances
    const balances = await getUserBalances(payload.walletAddress);

    return NextResponse.json({
      authenticated: true,
      user: {
        walletAddress: user.walletAddress,
        uid: user.uid,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        balances
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth-token');
  return response;
}
