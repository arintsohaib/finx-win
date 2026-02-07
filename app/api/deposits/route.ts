export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { getCryptoRate, cryptoToUsdt } from '@/lib/crypto-rates';
import { logActivity } from '@/lib/activity-logger';
// Get deposit history
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

    const deposits = await prisma.deposit.findMany({
      where: { walletAddress: payload.walletAddress },
      orderBy: { createdAt: 'desc' }
    });

    // Convert Decimal types to numbers for JSON serialization
    const serializedDeposits = deposits.map((deposit: any) => ({
      ...deposit,
      cryptoAmount: Number(deposit.cryptoAmount),
      usdtAmount: Number(deposit.usdtAmount),
      conversionRate: Number(deposit.conversionRate),
      createdAt: deposit.createdAt.toISOString(),
      approvedAt: deposit.approvedAt?.toISOString() || null,
      rejectedAt: deposit.rejectedAt?.toISOString() || null
    }));

    return NextResponse.json({ deposits: serializedDeposits });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposit history' },
      { status: 500 }
    );
  }
}

// Create deposit request
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
      txHash
    } = await request.json();

    if (!currency || !usdtAmount) {
      return NextResponse.json(
        { error: 'Currency and USDT amount are required' },
        { status: 400 }
      );
    }

    if (!txHash || txHash.length < 10) {
      return NextResponse.json(
        { error: 'Valid transaction hash is required' },
        { status: 400 }
      );
    }

    const usdtAmountNum = parseFloat(usdtAmount);

    // Verify minimum deposit
    const minDepositSetting = await prisma.walletSettings.findUnique({
      where: { key: 'min_deposit_usdt' },
    });

    const minDeposit = minDepositSetting ? parseFloat(minDepositSetting.value) : 10;

    if (usdtAmountNum < minDeposit) {
      return NextResponse.json(
        { error: `Minimum deposit is ${minDeposit} USDT` },
        { status: 400 }
      );
    }

    // Get crypto wallet address
    const cryptoWallet = await prisma.cryptoWallet.findUnique({
      where: { currency: currency.toUpperCase() }
    });

    if (!cryptoWallet || !cryptoWallet.isEnabled) {
      return NextResponse.json(
        { error: `${currency} deposits are not available` },
        { status: 400 }
      );
    }

    // Get current crypto rate with enhanced logging
    console.log(`[DEPOSIT] Fetching ${currency} rate...`);
    const cryptoRate = await getCryptoRate(currency);
    console.log(`[DEPOSIT] ${currency} rate: ${cryptoRate}`);
    
    const cryptoAmount = usdtAmountNum / cryptoRate;
    console.log(`[DEPOSIT] Calculated cryptoAmount: ${cryptoAmount} ${currency} for ${usdtAmountNum} USDT`);

    // ✅ VALIDATION: Ensure cryptoAmount is reasonable
    if (cryptoAmount <= 0 || !isFinite(cryptoAmount)) {
      console.error(`[DEPOSIT] Invalid cryptoAmount calculated: ${cryptoAmount}`);
      return NextResponse.json(
        { error: 'Unable to calculate deposit amount. Please try again.' },
        { status: 500 }
      );
    }

    // ✅ VALIDATION: For USDT, cryptoAmount should equal usdtAmount (1:1 ratio)
    if (currency.toUpperCase() === 'USDT') {
      const expectedCryptoAmount = usdtAmountNum;
      const difference = Math.abs(cryptoAmount - expectedCryptoAmount);
      
      if (difference > 0.01) {
        console.error(`[DEPOSIT] USDT amount mismatch! Expected: ${expectedCryptoAmount}, Got: ${cryptoAmount}`);
        return NextResponse.json(
          { error: 'USDT deposit calculation error. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // ✅ VALIDATION: Ensure conversion rate is reasonable
    if (cryptoRate <= 0 || !isFinite(cryptoRate)) {
      console.error(`[DEPOSIT] Invalid conversion rate: ${cryptoRate}`);
      return NextResponse.json(
        { error: 'Unable to fetch exchange rate. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[DEPOSIT] ✅ All validations passed. Creating deposit record...`);

    // Create deposit request
    const deposit = await prisma.deposit.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount,
        usdtAmount: usdtAmountNum,
        conversionRate: cryptoRate,
        depositAddress: cryptoWallet.walletAddress,
        txHash: txHash,
        paymentScreenshot: null, // Will be uploaded separately if provided
        status: 'pending'
      }
    });

    console.log(`[DEPOSIT] ✅ Deposit created successfully:`, {
      id: deposit.id,
      currency: deposit.currency,
      cryptoAmount: deposit.cryptoAmount,
      usdtAmount: deposit.usdtAmount,
      conversionRate: deposit.conversionRate
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: payload.walletAddress,
        type: 'deposit',
        title: 'Deposit Request Created',
        message: `Your deposit request for ${usdtAmountNum.toFixed(2)} USDT (${cryptoAmount.toFixed(8)} ${currency}) is pending admin approval.`,
        link: '/transactions'
      }
    });

    // Emit realtime events for instant admin notification
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: { uid: true, walletAddress: true }
    });

    if (user) {
      realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_CREATED, {
        ...deposit,
        uid: user.uid,
        userDisplay: `UID-${user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
      });
    }

    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, { walletAddress: payload.walletAddress });

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
      activityType: 'DEPOSIT_REQUEST',
      activityCategory: 'DEPOSIT',
      cryptoType: currency.toUpperCase(),
      amount: cryptoAmount,
      amountUsd: usdtAmountNum,
      status: 'pending',
      referenceId: deposit.id,
      metadata: {
        txHash,
        conversionRate: cryptoRate,
        depositAddress: cryptoWallet.walletAddress
      }
    });

    return NextResponse.json({ 
      success: true,
      deposit 
    });

  } catch (error) {
    console.error('Error creating deposit:', error);
    return NextResponse.json(
      { error: 'Failed to create deposit request' },
      { status: 500 }
    );
  }
}
