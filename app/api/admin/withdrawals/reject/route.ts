export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { Prisma } from '@prisma/client';
import { updateActivityStatus } from '@/lib/activity-logger';
export async function POST(request: NextRequest) {
  try {
    const { withdrawalId, adminNotes } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: 'Withdrawal ID is required' },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Withdrawal already processed' },
        { status: 400 }
      );
    }

    // Update withdrawal status
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        adminNotes: adminNotes || 'Rejected by admin'
      }
    });

    // Return frozen CRYPTO balance to user (not USDT!)
    const cryptoAmountToRefund = withdrawal.cryptoAmount.toNumber();

    await prisma.balance.update({
      where: {
        walletAddress_currency: {
          walletAddress: withdrawal.walletAddress,
          currency: withdrawal.currency // Use the actual crypto currency that was frozen
        }
      },
      data: {
        amount: { increment: cryptoAmountToRefund },
        frozenBalance: { decrement: cryptoAmountToRefund },
        realBalance: { increment: cryptoAmountToRefund }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: withdrawal.walletAddress,
        type: 'withdrawal',
        title: 'Withdrawal Rejected',
        message: `Your withdrawal request for ${withdrawal.cryptoAmount.toFixed(8)} ${withdrawal.currency} (≈ ${withdrawal.usdtAmount.toFixed(2)} USDT) has been rejected. The ${withdrawal.cryptoAmount.toFixed(8)} ${withdrawal.currency} has been refunded to your wallet. Reason: ${adminNotes || 'Not specified'}`,
        link: '/transactions'
      }
    });

    // Emit realtime event
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${withdrawal.walletAddress}`, { walletAddress: withdrawal.walletAddress });

    // Emit realtime event for admin UI update
    realtimeEvents.emit(REALTIME_EVENTS.WITHDRAWAL_UPDATED, {
      id: withdrawalId,
      status: 'rejected'
    });

    // Update the existing activity log instead of creating a new one
    await updateActivityStatus(
      withdrawal.id,
      'rejected',
      'WITHDRAWAL_REJECTED',
      {
        adminNotes,
        rejectionReason: adminNotes || 'Not specified',
        destinationAddress: withdrawal.destinationAddress,
        rejectedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Withdrawal rejected and funds returned'
    });

  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to reject withdrawal' },
      { status: 500 }
    );
  }
}
