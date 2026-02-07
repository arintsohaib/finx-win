export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { uploadPaymentProof } from '@/lib/file-upload';
import { Prisma } from '@prisma/client';
/**
 * Create a new deposit request with payment proof
 * New logic: Direct crypto deposit without USDT conversion requirement
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

    // Parse form data
    const formData = await request.formData();
    const currency = formData.get('currency') as string;
    const amount = formData.get('amount') as string;
    const walletAddress = formData.get('walletAddress') as string;
    const screenshot = formData.get('screenshot') as File;

    if (!currency || !amount || !screenshot) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const cryptoAmount = parseFloat(amount);

    if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Verify crypto wallet exists and is enabled
    const cryptoWallet = await prisma.cryptoWallet.findUnique({
      where: { currency: currency.toUpperCase() }
    });

    if (!cryptoWallet || !cryptoWallet.isEnabled) {
      return NextResponse.json(
        { error: `${currency} deposits are currently not available` },
        { status: 400 }
      );
    }

    // Upload screenshot to MinIO S3
    const uploadResult = await uploadPaymentProof(screenshot, payload.walletAddress);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload payment proof' },
        { status: 500 }
      );
    }

    const filePath = uploadResult.url!;

    // Create deposit request
    const deposit = await prisma.deposit.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        cryptoAmount: cryptoAmount,
        usdtAmount: 0, // Not used in new logic
        conversionRate: 0, // Not used in new logic
        depositAddress: cryptoWallet.walletAddress,
        paymentScreenshot: filePath,
        status: 'pending'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: payload.walletAddress,
        type: 'deposit',
        title: 'Deposit Request Submitted',
        message: `Your deposit request for ${cryptoAmount} ${currency} has been submitted and is pending admin approval.`,
        link: '/transactions'
      }
    });

    // Emit realtime events
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: { uid: true, walletAddress: true }
    });

    if (user) {
      realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_CREATED, {
        id: deposit.id,
        walletAddress: deposit.walletAddress,
        currency: deposit.currency,
        cryptoAmount: Number(deposit.cryptoAmount),
        status: deposit.status,
        createdAt: deposit.createdAt,
        uid: user.uid,
        userDisplay: `UID-${user.uid} | ${payload.walletAddress.slice(0, 6)}...${payload.walletAddress.slice(-4)}`,
      });
    }

    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, {
      walletAddress: payload.walletAddress
    });

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        currency: deposit.currency,
        cryptoAmount: Number(deposit.cryptoAmount),
        status: deposit.status,
        createdAt: deposit.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating deposit:', error);
    return NextResponse.json(
      { error: 'Failed to create deposit request' },
      { status: 500 }
    );
  }
}
