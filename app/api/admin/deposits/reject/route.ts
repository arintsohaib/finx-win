export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
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

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId }
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

    // Update deposit status
    await prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        adminNotes: adminNotes || 'Rejected by admin',
        processedBy: admin.username,
        processedAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        walletAddress: deposit.walletAddress,
        type: 'deposit',
        title: 'Deposit Rejected',
        message: `Your deposit of ${deposit.usdtAmount.toFixed(2)} USDT has been rejected. Reason: ${adminNotes || 'Not specified'}`,
        link: '/transactions'
      }
    });

    // Emit realtime event for user balance
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${deposit.walletAddress}`, { walletAddress: deposit.walletAddress });

    // Emit realtime event for admin UI update
    realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_UPDATED, {
      id: depositId,
      status: 'rejected'
    });

    // Get user info for activity logging
    const user = await prisma.user.findUnique({
      where: { walletAddress: deposit.walletAddress },
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
      walletAddress: deposit.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'DEPOSIT_REJECTED',
      activityCategory: 'DEPOSIT',
      cryptoType: deposit.currency,
      amount: deposit.cryptoAmount.toNumber(),
      amountUsd: deposit.usdtAmount.toNumber(),
      status: 'rejected',
      referenceId: deposit.id,
      adminId: admin.id,
      metadata: {
        adminNotes,
        rejectionReason: adminNotes || 'Not specified'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Deposit rejected'
    });

  } catch (error) {
    console.error('Error rejecting deposit:', error);
    return NextResponse.json(
      { error: 'Failed to reject deposit' },
      { status: 500 }
    );
  }
}
