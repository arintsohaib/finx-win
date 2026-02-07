export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { uploadPaymentProof } from '@/lib/file-upload';
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Deposit Crypto API] No auth token found');
      }
      return NextResponse.json(
        { error: 'Not authenticated. Please log in to make a deposit.' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Deposit Crypto API] Invalid auth token');
      }
      return NextResponse.json(
        { error: 'Invalid authentication. Please log in again.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const currency = formData.get('currency') as string;
    const usdtAmount = formData.get('usdtAmount') as string;
    const cryptoAmount = formData.get('cryptoAmount') as string;
    const conversionRate = formData.get('conversionRate') as string;
    const screenshot = formData.get('screenshot') as File | null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Deposit Crypto API] Received data:', {
        currency,
        usdtAmount,
        cryptoAmount,
        conversionRate,
        hasScreenshot: !!screenshot,
        walletAddress: `${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`
      });
    }

    // Validate inputs
    if (!currency || !usdtAmount || !cryptoAmount || !conversionRate) {
      console.error('[Deposit Crypto API] Missing required fields');
      return NextResponse.json(
        { error: 'All deposit information is required' },
        { status: 400 }
      );
    }

    const usdtAmountNum = parseFloat(usdtAmount);
    const cryptoAmountNum = parseFloat(cryptoAmount);
    const conversionRateNum = parseFloat(conversionRate);

    if (isNaN(usdtAmountNum) || usdtAmountNum <= 0) {
      console.error('[Deposit Crypto API] Invalid USDT amount:', usdtAmount);
      return NextResponse.json(
        { error: 'Invalid USDT amount' },
        { status: 400 }
      );
    }

    if (isNaN(cryptoAmountNum) || cryptoAmountNum <= 0) {
      console.error('[Deposit Crypto API] Invalid crypto amount:', cryptoAmount);
      return NextResponse.json(
        { error: 'Invalid crypto amount' },
        { status: 400 }
      );
    }

    if (isNaN(conversionRateNum) || conversionRateNum <= 0) {
      console.error('[Deposit Crypto API] Invalid conversion rate:', conversionRate);
      return NextResponse.json(
        { error: 'Invalid conversion rate' },
        { status: 400 }
      );
    }

    // Get crypto wallet to verify it exists and is enabled
    const cryptoWallet = await prisma.cryptoWallet.findFirst({
      where: {
        currency: currency.toUpperCase(),
        isEnabled: true
      }
    });

    if (!cryptoWallet) {
      console.error('[Deposit Crypto API] Crypto wallet not found or disabled:', currency);
      return NextResponse.json(
        { error: `${currency} deposits are currently unavailable. Please contact support.` },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') console.log('[Deposit Crypto API] Found crypto wallet:', {
      currency: cryptoWallet.currency,
      minDeposit: Number(cryptoWallet.minDepositUsdt)
    });

    // Validate minimum deposit (in USDT)
    const minDeposit = Number(cryptoWallet.minDepositUsdt);
    if (usdtAmountNum < minDeposit) {
      console.error('[Deposit Crypto API] Amount below minimum:', {
        usdtAmount: usdtAmountNum,
        minimum: minDeposit
      });
      return NextResponse.json(
        { error: `Minimum deposit is ${minDeposit} USDT` },
        { status: 400 }
      );
    }

    // Get user UID for deposit creation and image processing
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: { uid: true },
    });

    if (!user) {
      console.error('[Deposit Crypto API] User not found:', payload.walletAddress);
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 404 }
      );
    }

    // Create deposit request first (without payment proof)
    if (process.env.NODE_ENV === 'development') console.log('[Deposit Crypto API] Creating deposit record...');
    const deposit = await prisma.deposit.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount: cryptoAmountNum,
        usdtAmount: usdtAmountNum,
        conversionRate: conversionRateNum,
        depositAddress: cryptoWallet.walletAddress,
        txHash: `USER-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        paymentScreenshot: null,
        status: 'pending',
      },
    });

    // Upload payment proof image to MinIO if provided (after deposit is created)
    let paymentProofUrl: string | null = null;
    if (screenshot && screenshot.size > 0) {
      const uploadResult = await uploadPaymentProof(
        screenshot,
        user.uid.toString()
      );

      if (uploadResult.success && uploadResult.url) {
        paymentProofUrl = uploadResult.url;

        // Update deposit with payment proof MinIO URL
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: { paymentScreenshot: paymentProofUrl },
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('[Deposit Crypto API] Payment proof uploaded to MinIO:', paymentProofUrl);
        }
      } else {
        console.error('[Deposit Crypto API] Failed to upload payment proof to MinIO:', uploadResult.error);
        // Don't fail the whole deposit, just log the error
      }
    }
    if (process.env.NODE_ENV === 'development') console.log('[Deposit Crypto API] Deposit created successfully:', {
      id: deposit.id,
      hasPaymentProof: !!paymentProofUrl
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: payload.walletAddress,
        type: 'deposit',
        title: 'Deposit Request Submitted',
        message: `Your deposit request for ${usdtAmountNum.toFixed(2)} USDT (${cryptoAmountNum.toFixed(8)} ${currency}) has been submitted and is pending admin approval.`,
        link: '/transactions',
      },
    });

    // Emit real-time events
    if (user) {
      realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_CREATED, {
        id: deposit.id,
        uid: user.uid,
        userDisplay: `UID-${user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
        walletAddress: payload.walletAddress,
        currency: deposit.currency,
        cryptoAmount: Number(deposit.cryptoAmount),
        usdtAmount: Number(deposit.usdtAmount),
        conversionRate: Number(deposit.conversionRate),
        status: deposit.status,
        paymentScreenshot: paymentProofUrl,
        depositAddress: deposit.depositAddress,
        createdAt: deposit.createdAt.toISOString(),
      });

      realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, {
        walletAddress: payload.walletAddress,
        depositId: deposit.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit request submitted successfully',
      deposit: {
        id: deposit.id,
        currency: deposit.currency,
        cryptoAmount: Number(deposit.cryptoAmount),
        usdtAmount: Number(deposit.usdtAmount),
        status: deposit.status,
      },
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('[Deposit Crypto API] Fatal error:', error);

    const errorMessage = error instanceof Error
      ? `Failed to submit deposit: ${error.message}`
      : 'Failed to submit deposit request. Please try again.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
