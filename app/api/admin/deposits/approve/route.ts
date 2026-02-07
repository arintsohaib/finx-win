export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity-logger';

import { requireAdmin } from '@/lib/admin-middleware';
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const { depositId, adminNotes } = await request.json();

    if (!depositId) {
      return NextResponse.json(
        { error: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Perform all operations in a single transaction with atomic status check
    // This prevents race conditions where admin might approve the same deposit multiple times
    const result = await prisma.$transaction(async (tx: any) => {
      // Step 1: Fetch deposit details
      const deposit = await tx.deposit.findUnique({
        where: { id: depositId }
      });

      if (!deposit) {
        throw new Error('DEPOSIT_NOT_FOUND');
      }

      if (deposit.status !== 'pending') {
        throw new Error('DEPOSIT_ALREADY_PROCESSED');
      }

      // Step 2: Update deposit status with WHERE clause to ensure atomicity
      // This prevents double-approval even if two requests pass the check above
      const updateResult = await tx.deposit.updateMany({
        where: {
          id: depositId,
          status: 'pending' // Only update if STILL pending
        },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          adminNotes: adminNotes || null,
          processedBy: admin.username,
          processedAt: new Date()
        }
      });

      // If no rows were updated, deposit was already processed by another request
      if (updateResult.count === 0) {
        throw new Error('DEPOSIT_ALREADY_PROCESSED');
      }

      // Step 3: Credit the exact crypto amount to user's balance
      const cryptoAmount = deposit.cryptoAmount.toNumber();
      const currency = deposit.currency;

      await tx.balance.upsert({
        where: {
          walletAddress_currency: {
            walletAddress: deposit.walletAddress,
            currency: currency
          }
        },
        update: {
          amount: { increment: cryptoAmount },
          realBalance: { increment: cryptoAmount }
        },
        create: {
          walletAddress: deposit.walletAddress,
          currency: currency,
          amount: cryptoAmount,
          realBalance: cryptoAmount,
          realWinnings: 0,
          frozenBalance: 0
        }
      });

      // Step 4: Create notification
      await tx.notification.create({
        data: {
          walletAddress: deposit.walletAddress,
          type: 'deposit',
          title: 'Deposit Approved',
          message: `Your deposit of ${cryptoAmount.toFixed(8)} ${currency} has been approved and credited to your ${currency} wallet.`,
          link: '/transactions'
        }
      });

      return { deposit, cryptoAmount, currency };
    });

    // Emit realtime event for user balance
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${result.deposit.walletAddress}`, {
      walletAddress: result.deposit.walletAddress
    });

    // Emit realtime event for admin UI update
    realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_UPDATED, {
      id: depositId,
      status: 'approved'
    });

    // Get user info for activity logging
    const user = await prisma.user.findUnique({
      where: { walletAddress: result.deposit.walletAddress },
      select: {
        uid: true,
        kycSubmissions: {
          where: { status: 'approved' },
          select: { fullName: true, email: true },
          take: 1
        }
      }
    });

    const kycInfo = user?.kycSubmissions?.[0];

    // Log activity for Live Overview
    await logActivity({
      walletAddress: result.deposit.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'DEPOSIT_APPROVED',
      activityCategory: 'DEPOSIT',
      cryptoType: result.currency,
      amount: result.cryptoAmount,
      amountUsd: result.deposit.usdtAmount.toNumber(),
      status: 'success',
      referenceId: result.deposit.id,
      adminId: admin.id,
      metadata: {
        adminNotes,
        conversionRate: result.deposit.conversionRate.toString()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deposit approved and ${result.cryptoAmount.toFixed(8)} ${result.currency} credited to user's wallet`
    });

  } catch (error) {
    console.error('Error approving deposit:', error);

    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === 'DEPOSIT_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Deposit not found' },
          { status: 404 }
        );
      }

      if (error.message === 'DEPOSIT_ALREADY_PROCESSED') {
        return NextResponse.json(
          { error: 'Deposit already processed' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to approve deposit' },
      { status: 500 }
    );
  }
}
