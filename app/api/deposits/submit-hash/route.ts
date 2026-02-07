export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { currency, txHash, cryptoAmount, usdtAmount, conversionRate, depositAddress } = body;

    if (!currency || !txHash || !depositAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create deposit record
    const deposit = await prisma.deposit.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount: cryptoAmount ? parseFloat(cryptoAmount) : 0,
        usdtAmount: usdtAmount ? parseFloat(usdtAmount) : 0,
        conversionRate: conversionRate ? parseFloat(conversionRate) : 1,
        depositAddress,
        txHash,
        status: 'pending',
      },
      include: {
        user: { select: { uid: true, walletAddress: true } }
      }
    });

    // Emit realtime event for admin dashboard
    realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_CREATED, {
      ...deposit,
      uid: deposit.user.uid,
      userDisplay: `UID-${deposit.user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
    });

    return NextResponse.json({
      success: true,
      data: deposit,
      message: 'Transaction hash submitted for verification',
    });

  } catch (error) {
    console.error('Submit hash error:', error);
    return NextResponse.json({ error: 'Failed to submit transaction hash' }, { status: 500 });
  }
}
