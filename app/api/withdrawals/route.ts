export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { getCryptoRate } from '@/lib/crypto-rates';
import { Prisma } from '@prisma/client';
// Get withdrawal history
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

    const withdrawals = await prisma.withdrawal.findMany({
      where: { walletAddress: payload.walletAddress },
      orderBy: { createdAt: 'desc' }
    });

    // Convert Decimal types to numbers for JSON serialization
    const serializedWithdrawals = withdrawals.map((withdrawal: any) => ({
      ...withdrawal,
      cryptoAmount: Number(withdrawal.cryptoAmount),
      usdtAmount: Number(withdrawal.usdtAmount),
      conversionRate: Number(withdrawal.conversionRate),
      fee: Number(withdrawal.fee),
      createdAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString() || null,
      rejectedAt: withdrawal.rejectedAt?.toISOString() || null
    }));

    return NextResponse.json({ withdrawals: serializedWithdrawals });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal history' },
      { status: 500 }
    );
  }
}

// Create withdrawal request
export async function POST(request: NextRequest) {
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

    const { 
      currency, 
      usdtAmount, 
      destinationAddress 
    } = await request.json();

    if (!currency || !usdtAmount || !destinationAddress) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const withdrawalUsdtAmount = parseFloat(usdtAmount);

    // Verify minimum withdrawal
    const minWithdrawalSetting = await prisma.walletSettings.findUnique({
      where: { key: 'min_withdrawal_usdt' },
    });

    const minWithdrawal = minWithdrawalSetting ? parseFloat(minWithdrawalSetting.value) : 10;

    if (withdrawalUsdtAmount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minWithdrawal} USDT` },
        { status: 400 }
      );
    }

    // No withdrawal fees
    const fee = 0;
    const totalRequired = withdrawalUsdtAmount;

    // Check user's USDT balance
    const usdtBalance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress: payload.walletAddress,
          currency: 'USDT'
        }
      }
    });

    if (!usdtBalance || usdtBalance.amount.lessThan(totalRequired)) {
      return NextResponse.json(
        { error: `Insufficient USDT balance. You need at least ${totalRequired.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Get current crypto rate
    const cryptoRate = await getCryptoRate(currency);
    const cryptoAmount = withdrawalUsdtAmount / cryptoRate;

    // Freeze the balance
    await prisma.balance.update({
      where: {
        walletAddress_currency: {
          walletAddress: payload.walletAddress,
          currency: 'USDT'
        }
      },
      data: {
        amount: { decrement: totalRequired },
        frozenBalance: { increment: totalRequired }
      }
    });

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount,
        usdtAmount: withdrawalUsdtAmount,
        conversionRate: cryptoRate,
        destinationAddress,
        fee,
        status: 'pending'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: payload.walletAddress,
        type: 'withdrawal',
        title: 'Withdrawal Request Created',
        message: `Your withdrawal request for ${withdrawalUsdtAmount.toFixed(2)} USDT (${cryptoAmount.toFixed(8)} ${currency}) is pending admin approval. Amount frozen: ${totalRequired.toFixed(2)} USDT.`,
        link: '/transactions'
      }
    });

    // Emit realtime events for instant admin notification
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: { uid: true, walletAddress: true }
    });

    if (user) {
      realtimeEvents.emit(REALTIME_EVENTS.WITHDRAWAL_CREATED, {
        ...withdrawal,
        uid: user.uid,
        userDisplay: `UID-${user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
      });
    }

    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, { walletAddress: payload.walletAddress });

    return NextResponse.json({
      success: true,
      withdrawal
    });

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to create withdrawal request' },
      { status: 500 }
    );
  }
}
