export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { requireAdmin } from '@/lib/admin-middleware';
import { logActivity } from '@/lib/activity-logger';
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const { depositId, status } = await req.json();

    if (!depositId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get deposit details
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
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

    const cryptoAmount = parseFloat(deposit.cryptoAmount.toString());
    const usdtAmount = parseFloat(deposit.usdtAmount.toString());

    // Update deposit status and handle balance update
    if (status === 'approved') {
      await prisma.$transaction(async (tx: any) => {
        // Update deposit status
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            status: 'approved',
            approvedAt: new Date(),
            processedBy: admin.username,
            processedAt: new Date(),
          },
        });

        // Credit the SPECIFIC CRYPTO balance (BTC, ETH, USDT, etc.)
        const currency = deposit.currency; // The actual crypto currency (BTC, ETH, etc.)

        if (cryptoAmount > 0) {
          const existingBalance = await tx.balance.findUnique({
            where: {
              walletAddress_currency: {
                walletAddress: deposit.walletAddress,
                currency: currency, // Credit the specific crypto, not USDT
              },
            },
          });

          if (existingBalance) {
            // Update existing balance for this crypto
            const currentAmount = parseFloat(existingBalance.amount.toString());
            const currentRealBalance = parseFloat(existingBalance.realBalance.toString());

            await tx.balance.update({
              where: {
                walletAddress_currency: {
                  walletAddress: deposit.walletAddress,
                  currency: currency,
                },
              },
              data: {
                amount: currentAmount + cryptoAmount,
                realBalance: currentRealBalance + cryptoAmount,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new balance for this crypto
            await tx.balance.create({
              data: {
                walletAddress: deposit.walletAddress,
                currency: currency,
                amount: cryptoAmount,
                realBalance: cryptoAmount,
                realWinnings: 0,
                frozenBalance: 0,
              },
            });
          }
        }

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: deposit.walletAddress,
            type: 'deposit',
            title: 'Deposit Approved',
            message: `Your deposit of ${cryptoAmount.toFixed(8)} ${deposit.currency} has been approved and credited to your ${deposit.currency} wallet.`,
            link: '/transactions',
          },
        });
      });
    } else {
      // Rejected
      await prisma.$transaction(async (tx: any) => {
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            status: 'rejected',
            rejectedAt: new Date(),
            processedBy: admin.username,
            processedAt: new Date(),
          },
        });

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: deposit.walletAddress,
            type: 'deposit',
            title: 'Deposit Rejected',
            message: `Your ${deposit.currency} deposit has been rejected. Please contact support if you believe this is an error.`,
            link: '/transactions',
          },
        });
      });
    }

    // Get user KYC info for activity logging
    const userKyc = await prisma.kYCSubmission.findFirst({
      where: { walletAddress: deposit.walletAddress, status: 'approved' },
      select: { fullName: true, email: true }
    });

    // Log admin action to database
    await logActivity({
      walletAddress: deposit.walletAddress,
      uid: deposit.user.uid,
      userName: userKyc?.fullName || undefined,
      userEmail: userKyc?.email || undefined,
      activityType: status === 'approved' ? 'DEPOSIT_APPROVED' : 'DEPOSIT_REJECTED',
      activityCategory: 'DEPOSIT',
      cryptoType: deposit.currency,
      amount: cryptoAmount,
      amountUsd: usdtAmount,
      status: status === 'approved' ? 'success' : 'rejected',
      referenceId: deposit.id,
      adminId: admin.id, // Fixed: Move to top-level
      metadata: {
        adminUsername: admin.username,
        actionType: status === 'approved' ? 'quick_approve' : 'reject',
        depositId: deposit.id,
        processedAt: new Date().toISOString(),
      }
    });

    console.log(`[ADMIN ACTION] Deposit ${depositId} ${status} by ${admin.username} for user ${deposit.user.uid}`);

    // Emit real-time events for instant updates
    const updatedDeposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: { select: { uid: true, walletAddress: true } } },
    });

    if (updatedDeposit) {
      // Notify admin panel
      realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_UPDATED, {
        ...updatedDeposit,
        uid: updatedDeposit.user.uid,
        userDisplay: `UID-${updatedDeposit.user.uid} | ${deposit.walletAddress.slice(0, 6)}...${deposit.walletAddress.slice(-4)}`,
      });

      // Notify specific user
      realtimeEvents.emit(`${REALTIME_EVENTS.DEPOSIT_UPDATED}:${deposit.walletAddress}`, updatedDeposit);

      if (status === 'approved') {
        realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${deposit.walletAddress}`, {
          currency: deposit.currency, // Emit the actual crypto currency
          amount: deposit.cryptoAmount?.toString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deposit ${status} successfully`,
    });
  } catch (error) {
    console.error('Error updating deposit:', error);
    return NextResponse.json(
      { error: 'Failed to update deposit' },
      { status: 500 }
    );
  }
}
