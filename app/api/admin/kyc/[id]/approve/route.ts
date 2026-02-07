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
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Update user KYC status
    await prisma.user.update({
      where: { walletAddress: kycSubmission.walletAddress },
      data: {
        kycStatus: 'approved',
        kycReviewedAt: new Date(),
        kycReviewedBy: adminId,
        kycRejectionReason: null,
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: kycSubmission.walletAddress,
        type: 'system',
        title: 'KYC Verification Approved',
        message: 'Your KYC verification has been approved. You can now proceed with withdrawals.',
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
      activityType: 'KYC_APPROVED',
      activityCategory: 'KYC',
      cryptoType: undefined,
      amount: undefined,
      amountUsd: undefined,
      status: 'success',
      referenceId: kycSubmission.id,
      metadata: {
        fullName: kycSubmission.fullName,
        email: kycSubmission.email,
        reviewedBy: adminId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'KYC approved successfully',
      data: updatedKyc,
    });
  } catch (error) {
    console.error('KYC approval error:', error);
    return NextResponse.json({ error: 'Failed to approve KYC submission' }, { status: 500 });
  }
}
