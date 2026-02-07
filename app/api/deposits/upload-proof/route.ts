export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadPaymentProof } from '@/lib/file-upload';
export async function POST(request: NextRequest) {
  try {
    // ✅ JWT Cookie Authentication ONLY (No Web3 checks)
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const depositId = formData.get('depositId') as string;
    const file = formData.get('file') as File;
    const txHash = formData.get('txHash') as string;

    if (!depositId || !file) {
      return NextResponse.json(
        { error: 'Deposit ID and file are required' },
        { status: 400 }
      );
    }

    // Verify deposit belongs to user
    const deposit = await prisma.deposit.findFirst({
      where: {
        id: depositId,
        walletAddress: payload.walletAddress
      },
      include: {
        user: {
          select: { uid: true }
        }
      }
    });

    if (!deposit || !deposit.user) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only upload proof for pending deposits' },
        { status: 400 }
      );
    }

    // Upload to MinIO with validation
    const uploadResult = await uploadPaymentProof(file, deposit.user.uid.toString());

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload payment proof' },
        { status: 400 }
      );
    }

    // Update deposit with payment screenshot MinIO URL
    const updatedDeposit = await prisma.deposit.update({
      where: { id: depositId },
      data: {
        paymentScreenshot: uploadResult.url,
        txHash: txHash || deposit.txHash
      }
    });

    return NextResponse.json({
      success: true,
      deposit: updatedDeposit
    });

  } catch (error) {
    console.error('Error uploading proof:', error);
    return NextResponse.json(
      { error: 'Failed to upload payment proof' },
      { status: 500 }
    );
  }
}
