export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-logger';
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const adminId = adminCheck.id; // Get admin ID from authenticated token
    const { id } = await context.params;
    const { reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Get KYC submission
    const kycSubmission = await prisma.kYCSubmission.findUnique({
      where: { id },
    });

    if (!kycSubmission) {
      return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 });
    }

    // Update KYC submission status
    const updatedKyc = await prisma.kYCSubmission.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Update user KYC status
    await prisma.user.update({
      where: { walletAddress: kycSubmission.walletAddress },
      data: {
        kycStatus: 'rejected',
        kycReviewedAt: new Date(),
        kycReviewedBy: adminId,
        kycRejectionReason: reason,
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: kycSubmission.walletAddress,
        type: 'system',
        title: 'KYC Verification Rejected',
        message: `Your KYC verification was rejected. Reason: ${reason}`,
        isRead: false,
      },
    });

    // Get user info for activity logging
    const user = await prisma.user.findUnique({
      where: { walletAddress: kycSubmission.walletAddress },
      select: { uid: true }
    });

    // Log activity for Live Overview
    await logActivity({
      walletAddress: kycSubmission.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycSubmission.fullName,
      userEmail: kycSubmission.email,
      activityType: 'KYC_REJECTED',
      activityCategory: 'KYC',
      cryptoType: undefined,
      amount: undefined,
      amountUsd: undefined,
      status: 'rejected',
      referenceId: kycSubmission.id,
      metadata: {
        fullName: kycSubmission.fullName,
        email: kycSubmission.email,
        rejectionReason: reason,
        reviewedBy: adminId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'KYC rejected successfully',
      data: updatedKyc,
    });
  } catch (error) {
    console.error('KYC rejection error:', error);
    return NextResponse.json({ error: 'Failed to reject KYC submission' }, { status: 500 });
  }
}
