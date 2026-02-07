export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
export async function POST(request: NextRequest) {
  try {
    // Use custom auth token verification
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const walletAddress = payload.walletAddress;
    const { fullName, email, phone, documentUrl } = await request.json();

    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: 'Name, Email, and Phone are required' }, { status: 400 });
    }

    // Check if user already has a pending or approved KYC
    const existingKYC = await prisma.kYCSubmission.findFirst({
      where: {
        walletAddress,
        status: {
          in: ['pending', 'approved'],
        },
      },
    });

    let kycSubmission;

    if (existingKYC) {
      // If approved, only allow adding document if missing (or strictly speaking, maybe not allow changing name info)
      // But user requested "later anytime user can also attached documents".
      // Assuming if pending, we update everything. If approved, we might just update document?
      // For simplicity and safety: If pending, update everything.
      if (existingKYC.status === 'pending') {
        kycSubmission = await prisma.kYCSubmission.update({
          where: { id: existingKYC.id },
          data: {
            fullName,
            email,
            phone,
            documentUrl: documentUrl || existingKYC.documentUrl, // Keep existing if not provided, or update
          },
        });
      } else {
        // If approved, currently we might block or just strictly update document?
        // Let's block full re-submission if approved, unless it's just a document upload (which this endpoint handles generally).
        // If the user is trying to add a document to an approved KYC, we can allow it.
        if (documentUrl && !existingKYC.documentUrl) {
          kycSubmission = await prisma.kYCSubmission.update({
            where: { id: existingKYC.id },
            data: { documentUrl },
          });
        } else if (documentUrl) {
          // Already has document, maybe replacing?
          kycSubmission = await prisma.kYCSubmission.update({
            where: { id: existingKYC.id },
            data: { documentUrl },
          });
        } else {
          return NextResponse.json(
            { error: 'You are already verified.' },
            { status: 400 }
          );
        }
      }
    } else {
      // Create new KYC submission
      kycSubmission = await prisma.kYCSubmission.create({
        data: {
          walletAddress,
          fullName,
          email,
          phone,
          documentUrl,
          status: 'pending',
        },
      });

      // Update user KYC status
      await prisma.user.update({
        where: { walletAddress },
        data: {
          kycStatus: 'pending',
          kycSubmittedAt: new Date(),
        },
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { uid: true }
    });

    // Log activity for Live Overview
    await logActivity({
      walletAddress,
      uid: user?.uid || 'unknown',
      userName: fullName,
      userEmail: email,
      activityType: 'KYC_SUBMITTED',
      activityCategory: 'KYC',
      cryptoType: undefined,
      amount: undefined,
      amountUsd: undefined,
      status: kycSubmission.status as any, // Cast to any to avoid ActivityStatus type mismatch
      referenceId: kycSubmission.id,
      metadata: {
        fullName,
        email,
        phone,
        hasDocument: !!documentUrl
      }
    });

    return NextResponse.json({
      message: 'KYC information submitted successfully.',
      submission: {
        id: kycSubmission.id,
        status: kycSubmission.status,
        fullName: kycSubmission.fullName,
        email: kycSubmission.email,
        phone: kycSubmission.phone,
        documentUrl: kycSubmission.documentUrl,
        rejectionReason: kycSubmission.rejectionReason,
      },
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}
