export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadPaymentProof } from '@/lib/file-upload';
/**
 * POST /api/upload
 * Upload a file (e.g., payment screenshot) to local storage
 */
export async function POST(request: NextRequest) {
  try {
    const userToken = request.cookies.get('auth-token')?.value;
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!userToken && !adminToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let payload: any = null;

    if (userToken) {
      payload = verifyToken(userToken);
    }

    if (!payload && adminToken) {
      const { verifyAdminToken } = require('@/lib/admin-auth');
      payload = verifyAdminToken(adminToken);
      // Ensure admin payload has walletAddress if needed by downstream logic
      // Admin payload has { id, username, role, permissions }
      // User payload has { walletAddress, uid }
      if (payload) {
        payload.walletAddress = 'ADMIN_' + payload.username; // Mock address for file naming
      }
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload to MinIO S3 - validation is handled inside uploadPaymentProof
    const uploadResult = await uploadPaymentProof(file, payload.walletAddress);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload file' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath: uploadResult.url, // S3 URL for database storage
      fileUrl: uploadResult.url,   // S3 URL for immediate display
      fileName: file.name,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
