export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { Prisma } from '@prisma/client';
import { updateActivityStatus } from '@/lib/activity-logger';
/**
 * Get deposit details including payment proof
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status }
    );
  }

  try {
    const { id } = await context.params;
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true
          }
        }
      }
    });

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Payment screenshot URL (MinIO URL stored directly in database)
    const paymentProofUrl = deposit.paymentScreenshot || null;

    return NextResponse.json({
      deposit: {
        ...deposit,
        cryptoAmount: Number(deposit.cryptoAmount),
        usdtAmount: Number(deposit.usdtAmount),
        conversionRate: Number(deposit.conversionRate),
        createdAt: deposit.createdAt.toISOString(),
        approvedAt: deposit.approvedAt?.toISOString() || null,
        rejectedAt: deposit.rejectedAt?.toISOString() || null,
        paymentProofUrl
      }
    });
  } catch (error) {
    console.error('Error fetching deposit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposit' },
      { status: 500 }
    );
  }
}

/**
 * Approve or reject deposit
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status }
    );
  }

  try {
    const { id } = await context.params;
    const { action, notes } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const deposit = await prisma.deposit.findUnique({
      where: { id }
    });

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { error: 'Deposit already processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Approve deposit
      await prisma.$transaction(async (tx: any) => {
        // Update deposit status
        await tx.deposit.update({
          where: { id },
          data: {
            status: 'approved',
            approvedAt: new Date(),
            adminNotes: notes || null
          }
        });

        // Add balance to user's wallet (in exact crypto amount)
        await tx.balance.upsert({
          where: {
            walletAddress_currency: {
              walletAddress: deposit.walletAddress,
              currency: deposit.currency
            }
          },
          create: {
            walletAddress: deposit.walletAddress,
            currency: deposit.currency,
            amount: deposit.cryptoAmount,
            realBalance: deposit.cryptoAmount,
            realWinnings: 0,
            frozenBalance: 0
          },
          update: {
            amount: { increment: deposit.cryptoAmount },
            realBalance: { increment: deposit.cryptoAmount }
          }
        });

        // Special handling for USDT: Also sync with main wallet
        if (deposit.currency === 'USDT') {
          // USDT balance is already updated above, no additional action needed
          // The main wallet display will pull from USDT balance
        }

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: deposit.walletAddress,
            type: 'deposit',
            title: 'Deposit Approved ✅',
            message: `Your deposit of ${Number(deposit.cryptoAmount)} ${deposit.currency} has been approved and added to your wallet.`,
            link: '/transactions'
          }
        });
      });

      // Emit realtime events
      realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${deposit.walletAddress}`, {
        walletAddress: deposit.walletAddress
      });

      // Update the existing activity log instead of creating a new one
      await updateActivityStatus(
        deposit.id,
        'success',
        'DEPOSIT_APPROVED',
        {
          adminNotes: notes,
          approvedAt: new Date().toISOString(),
          currency: deposit.currency,
          cryptoAmount: deposit.cryptoAmount.toString()
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Deposit approved successfully'
      });
    } else {
      // Reject deposit
      await prisma.$transaction(async (tx: any) => {
        await tx.deposit.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectedAt: new Date(),
            adminNotes: notes || 'Deposit rejected by admin'
          }
        });

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: deposit.walletAddress,
            type: 'deposit',
            title: 'Deposit Rejected ❌',
            message: `Your deposit of ${Number(deposit.cryptoAmount)} ${deposit.currency} has been rejected. Reason: ${notes || 'No reason provided'}`,
            link: '/transactions'
          }
        });
      });

      // Emit realtime events
      realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${deposit.walletAddress}`, {
        walletAddress: deposit.walletAddress
      });

      // Update the existing activity log instead of creating a new one
      await updateActivityStatus(
        deposit.id,
        'rejected',
        'DEPOSIT_REJECTED',
        {
          adminNotes: notes || 'Rejected by admin',
          rejectedAt: new Date().toISOString(),
          rejectionReason: notes || 'No reason provided'
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected'
      });
    }
  } catch (error) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { error: 'Failed to process deposit' },
      { status: 500 }
    );
  }
}
