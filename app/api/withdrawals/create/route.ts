export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity-logger';
/**
 * Create withdrawal request
 * New logic: USDT-only withdrawals
 */
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

    // Check if KYC is required for withdrawals
    const kycRequiredSetting = await prisma.adminSettings.findUnique({
      where: { key: 'kyc_required_for_withdrawal' },
    });

    const kycRequired = kycRequiredSetting?.value === 'true';

    if (kycRequired) {
      // Check user's KYC status
      const user = await prisma.user.findUnique({
        where: { walletAddress: payload.walletAddress },
        select: { kycStatus: true },
      });

      if (!user || user.kycStatus !== 'approved') {
        return NextResponse.json(
          {
            error: 'KYC verification required',
            message: 'Please complete KYC verification in your Profile page before making withdrawals.',
            requiresKyc: true
          },
          { status: 403 }
        );
      }
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

    if (isNaN(withdrawalUsdtAmount) || withdrawalUsdtAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Verify minimum withdrawal (per-currency from CryptoWallet)
    const cryptoWallet = await prisma.cryptoWallet.findUnique({
      where: { currency: currency.toUpperCase() },
      select: { minWithdrawUsdt: true, isEnabled: true },
    });

    if (!cryptoWallet) {
      return NextResponse.json(
        { error: 'Cryptocurrency wallet not found' },
        { status: 404 }
      );
    }

    if (!cryptoWallet.isEnabled) {
      return NextResponse.json(
        { error: `${currency} withdrawals are currently disabled` },
        { status: 403 }
      );
    }

    const minWithdrawal = Number(cryptoWallet.minWithdrawUsdt);

    if (withdrawalUsdtAmount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal for ${currency} is ${minWithdrawal} USDT` },
        { status: 400 }
      );
    }

    // Get current crypto rate from CoinMarketCap
    const { getCryptoRate } = await import('@/lib/crypto-rates');
    const cryptoRate = await getCryptoRate(currency);

    if (!cryptoRate || cryptoRate <= 0) {
      return NextResponse.json(
        { error: 'Unable to fetch current crypto price. Please try again.' },
        { status: 500 }
      );
    }

    // Calculate crypto amount needed (USDT / price = crypto amount)
    const cryptoAmount = withdrawalUsdtAmount / cryptoRate;

    // No withdrawal fees
    const fee = 0;

    // Check crypto balance
    const cryptoBalance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress: payload.walletAddress,
          currency: currency.toUpperCase()
        }
      }
    });

    if (!cryptoBalance || cryptoBalance.amount.lessThan(cryptoAmount)) {
      return NextResponse.json(
        { error: `Insufficient ${currency} balance. You need ${cryptoAmount.toFixed(8)} ${currency} but only have ${cryptoBalance?.amount?.toString() || '0'} ${currency}.` },
        { status: 400 }
      );
    }

    // Freeze the crypto balance
    await prisma.balance.update({
      where: {
        walletAddress_currency: {
          walletAddress: payload.walletAddress,
          currency: currency.toUpperCase()
        }
      },
      data: {
        amount: { decrement: cryptoAmount },
        frozenBalance: { increment: cryptoAmount }
      }
    });

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount: cryptoAmount,
        usdtAmount: withdrawalUsdtAmount,
        conversionRate: cryptoRate,
        destinationAddress,
        fee: fee,
        status: 'pending'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: payload.walletAddress,
        type: 'withdrawal',
        title: 'Withdrawal Request Created',
        message: `Your withdrawal request for ${cryptoAmount.toFixed(8)} ${currency} (≈ ${withdrawalUsdtAmount.toFixed(2)} USDT) is pending admin approval. Amount frozen: ${cryptoAmount.toFixed(8)} ${currency}.`,
        link: '/transactions'
      }
    });

    // Emit realtime events
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: { uid: true, walletAddress: true }
    });

    if (user) {
      realtimeEvents.emit(REALTIME_EVENTS.WITHDRAWAL_CREATED, {
        id: withdrawal.id,
        walletAddress: withdrawal.walletAddress,
        currency: withdrawal.currency,
        usdtAmount: Number(withdrawal.usdtAmount),
        amount: Number(withdrawal.cryptoAmount), // Add amount (crypto amount)
        fee: Number(withdrawal.fee), // Add fee
        destinationAddress: withdrawal.destinationAddress, // Add destination
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        uid: user.uid,
        userDisplay: `UID-${user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
      });
    }

    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, {
      walletAddress: payload.walletAddress
    });

    // Get user info including KYC data for activity logging
    const userWithKyc = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: {
        uid: true,
        kycSubmissions: {
          where: { status: 'approved' },
          select: { fullName: true, email: true },
          take: 1
        }
      }
    });

    const kycInfo = userWithKyc?.kycSubmissions?.[0];

    // Log activity for Live Overview
    await logActivity({
      walletAddress: payload.walletAddress,
      uid: userWithKyc?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'WITHDRAWAL_REQUEST',
      activityCategory: 'WITHDRAWAL',
      cryptoType: currency.toUpperCase(),
      amount: cryptoAmount,
      amountUsd: withdrawalUsdtAmount,
      status: 'pending',
      referenceId: withdrawal.id,
      metadata: {
        destinationAddress,
        fee: fee.toString(),
        conversionRate: cryptoRate.toString(),
        usdtAmount: withdrawalUsdtAmount.toString()
      }
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        currency: withdrawal.currency,
        cryptoAmount: Number(withdrawal.cryptoAmount),
        usdtAmount: Number(withdrawal.usdtAmount),
        conversionRate: Number(withdrawal.conversionRate),
        fee: Number(withdrawal.fee),
        status: withdrawal.status,
        createdAt: withdrawal.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to create withdrawal request' },
      { status: 500 }
    );
  }
}
