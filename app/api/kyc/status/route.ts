export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: {
        kycStatus: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the latest KYC submission to get fullName and email
    const kycSubmission = await prisma.kYCSubmission.findFirst({
      where: { walletAddress: payload.walletAddress },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        rejectionReason: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({
      ...user,
      fullName: kycSubmission?.fullName || '',
      email: kycSubmission?.email || '',
      submissionId: kycSubmission?.id,
    });
  } catch (error) {
    console.error('KYC status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch KYC status' }, { status: 500 });
  }
}
