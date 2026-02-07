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

    const { withdrawalId, status, txHash } = await req.json();

    if (!withdrawalId || !status) {
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

    // Get withdrawal details
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
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

    const cryptoAmount = parseFloat(withdrawal.cryptoAmount.toString());
    const usdtAmount = parseFloat(withdrawal.usdtAmount.toString());

    // Update withdrawal status
    if (status === 'approved') {
      await prisma.$transaction(async (tx: any) => {
        // Update withdrawal
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'approved',
            processedAt: new Date(),
            processedBy: admin.username,
            txHash: txHash || null,
          },
        });

        // Reduce frozen USDT balance (amount was already moved from real balance to frozen)
        const totalUsdtAmount = parseFloat(withdrawal.usdtAmount.toString()) + parseFloat(withdrawal.fee.toString());
        const userBalance = await tx.balance.findUnique({
          where: {
            walletAddress_currency: {
              walletAddress: withdrawal.walletAddress,
              currency: 'USDT',
            },
          },
        });

        if (userBalance) {
          const currentFrozen = parseFloat(userBalance.frozenBalance.toString());
          const newFrozen = Math.max(0, currentFrozen - totalUsdtAmount);

          await tx.balance.update({
            where: {
              walletAddress_currency: {
                walletAddress: withdrawal.walletAddress,
                currency: 'USDT',
              },
            },
            data: {
              frozenBalance: newFrozen,
              updatedAt: new Date(),
            },
          });
        }

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: withdrawal.walletAddress,
            type: 'withdrawal',
            title: 'Withdrawal Approved',
            message: `Your withdrawal of ${withdrawal.cryptoAmount} ${withdrawal.currency} (${withdrawal.usdtAmount} USDT) has been processed${txHash ? `. Transaction: ${txHash}` : ''}.`,
            link: '/transactions',
          },
        });
      });
    } else {
      // Rejected - unfreeze and return the crypto amount to real balance
      await prisma.$transaction(async (tx: any) => {
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'rejected',
            processedAt: new Date(),
            processedBy: admin.username,
            rejectedAt: new Date(),
          },
        });

        // Unfreeze and return the CRYPTO amount to real balance (not USDT!)
        const cryptoAmountToRefund = parseFloat(withdrawal.cryptoAmount.toString());

        const userCryptoBalance = await tx.balance.findUnique({
          where: {
            walletAddress_currency: {
              walletAddress: withdrawal.walletAddress,
              currency: withdrawal.currency, // Use the actual crypto currency that was frozen
            },
          },
        });

        if (userCryptoBalance) {
          const currentFrozen = parseFloat(userCryptoBalance.frozenBalance.toString());
          const currentRealBalance = parseFloat(userCryptoBalance.realBalance.toString());

          await tx.balance.update({
            where: {
              walletAddress_currency: {
                walletAddress: withdrawal.walletAddress,
                currency: withdrawal.currency, // Use the actual crypto currency
              },
            },
            data: {
              frozenBalance: Math.max(0, currentFrozen - cryptoAmountToRefund),
              realBalance: currentRealBalance + cryptoAmountToRefund,
              amount: { increment: cryptoAmountToRefund }, // Also update the total amount
              updatedAt: new Date(),
            },
          });
        }

        // Create notification
        await tx.notification.create({
          data: {
            walletAddress: withdrawal.walletAddress,
            type: 'withdrawal',
            title: 'Withdrawal Rejected',
            message: `Your withdrawal request for ${withdrawal.cryptoAmount} ${withdrawal.currency} (≈ ${withdrawal.usdtAmount} USDT) has been rejected. The ${withdrawal.cryptoAmount} ${withdrawal.currency} has been refunded to your wallet.`,
            link: '/transactions',
          },
        });
      });
    }

    // Get user KYC info for activity logging
    const userKyc = await prisma.kYCSubmission.findFirst({
      where: { walletAddress: withdrawal.walletAddress, status: 'approved' },
      select: { fullName: true, email: true }
    });

    // Log admin action to database
    await logActivity({
      walletAddress: withdrawal.walletAddress,
      uid: withdrawal.user.uid,
      userName: userKyc?.fullName || undefined,
      userEmail: userKyc?.email || undefined,
      activityType: status === 'approved' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
      activityCategory: 'WITHDRAWAL',
      cryptoType: withdrawal.currency,
      amount: cryptoAmount,
      amountUsd: usdtAmount,
      status: status === 'approved' ? 'success' : 'rejected',
      referenceId: withdrawal.id,
      adminId: admin.id, // Fixed: Move to top-level
      metadata: {
        adminUsername: admin.username,
        actionType: status === 'approved' ? 'approve' : 'reject',
        withdrawalId: withdrawal.id,
        txHash: txHash || null,
        processedAt: new Date().toISOString(),
      }
    });

    console.log(`[ADMIN ACTION] Withdrawal ${withdrawalId} ${status} by ${admin.username} for user ${withdrawal.user.uid}`);

    // Emit real-time events for instant updates
    const updatedWithdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { select: { uid: true, walletAddress: true } } },
    });

    if (updatedWithdrawal) {
      // Notify admin panel
      realtimeEvents.emit(REALTIME_EVENTS.WITHDRAWAL_UPDATED, {
        ...updatedWithdrawal,
        uid: updatedWithdrawal.user.uid,
        userDisplay: `UID-${updatedWithdrawal.user.uid} | ${withdrawal.walletAddress.slice(0, 6)}...${withdrawal.walletAddress.slice(-4)}`,
      });

      // Notify specific user
      realtimeEvents.emit(`${REALTIME_EVENTS.WITHDRAWAL_UPDATED}:${withdrawal.walletAddress}`, updatedWithdrawal);
      realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${withdrawal.walletAddress}`, {
        currency: 'USDT',
        status: status,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to update withdrawal' },
      { status: 500 }
    );
  }
}

