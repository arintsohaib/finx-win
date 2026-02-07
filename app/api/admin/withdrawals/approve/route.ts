export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { Prisma } from '@prisma/client';
import { updateActivityStatus } from '@/lib/activity-logger';
export async function POST(request: NextRequest) {
  try {
    const { withdrawalId, txHash, adminNotes } = await request.json();

    if (!withdrawalId || !txHash) {
      return NextResponse.json(
        { error: 'Withdrawal ID and transaction hash are required' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Perform all operations in a single transaction with atomic status check
    // This prevents race conditions where admin might approve the same withdrawal multiple times
    const result = await prisma.$transaction(async (tx: any) => {
      // Step 1: Fetch withdrawal details
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId }
      });

      if (!withdrawal) {
        throw new Error('WITHDRAWAL_NOT_FOUND');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error('WITHDRAWAL_ALREADY_PROCESSED');
      }

      // Step 2: Update withdrawal status with WHERE clause to ensure atomicity
      // This prevents double-approval even if two requests pass the check above
      const updateResult = await tx.withdrawal.updateMany({
        where: {
          id: withdrawalId,
          status: 'pending' // Only update if STILL pending
        },
        data: {
          status: 'approved',
          processedAt: new Date(),
          txHash,
          adminNotes: adminNotes || null
        }
      });

      // If no rows were updated, withdrawal was already processed by another request
      if (updateResult.count === 0) {
        throw new Error('WITHDRAWAL_ALREADY_PROCESSED');
      }

      // Step 3: Unfreeze the balance (it's already deducted, just remove from frozen)
      const totalAmount = withdrawal.usdtAmount.toNumber() + withdrawal.fee.toNumber();

      await tx.balance.update({
        where: {
          walletAddress_currency: {
            walletAddress: withdrawal.walletAddress,
            currency: 'USDT'
          }
        },
        data: {
          frozenBalance: { decrement: totalAmount }
        }
      });

      // Step 4: Create notification
      await tx.notification.create({
        data: {
          walletAddress: withdrawal.walletAddress,
          type: 'withdrawal',
          title: 'Withdrawal Approved',
          message: `Your withdrawal of ${withdrawal.usdtAmount.toFixed(2)} USDT has been processed. TX Hash: ${txHash}`,
          link: '/transactions'
        }
      });

      return { withdrawal };
    });

    // Emit realtime event (outside transaction for performance)
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${result.withdrawal.walletAddress}`, {
      walletAddress: result.withdrawal.walletAddress
    });

    // Emit realtime event for admin UI update
    realtimeEvents.emit(REALTIME_EVENTS.WITHDRAWAL_UPDATED, {
      id: withdrawalId,
      status: 'approved'
    });

    // Update the existing activity log instead of creating a new one
    await updateActivityStatus(
      result.withdrawal.id,
      'success',
      'WITHDRAWAL_APPROVED',
      {
        txHash,
        adminNotes,
        destinationAddress: result.withdrawal.destinationAddress,
        approvedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Withdrawal approved and processed'
    });

  } catch (error) {
    console.error('Error approving withdrawal:', error);

    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === 'WITHDRAWAL_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Withdrawal not found' },
          { status: 404 }
        );
      }

      if (error.message === 'WITHDRAWAL_ALREADY_PROCESSED') {
        return NextResponse.json(
          { error: 'Withdrawal already processed' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to approve withdrawal' },
      { status: 500 }
    );
  }
}
