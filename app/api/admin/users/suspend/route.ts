export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, hasPermission, PERMISSIONS, AdminJWTPayload } from '@/lib/admin-auth';
export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const adminResult = await requireAdmin(req);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // ✅ SECURITY: Check MANAGE_USERS permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const { uid, isSuspended, suspensionReason } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'User UID is required' },
        { status: 400 }
      );
    }

    // Default reason if suspending without a reason
    const finalReason = isSuspended ? (suspensionReason || 'Account suspended by administrator') : null;

    const updatedUser = await prisma.user.update({
      where: { uid },
      data: {
        isSuspended,
        suspensionReason: finalReason,
      },
      select: {
        walletAddress: true,
        uid: true,
        isSuspended: true,
        suspensionReason: true,
      },
    });

    console.log(`[Admin] User ${updatedUser.uid} suspension status changed: ${isSuspended}`);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: isSuspended ? 'User suspended successfully' : 'User unsuspended successfully',
    });
  } catch (error) {
    console.error('Error updating user suspension:', error);
    return NextResponse.json(
      { error: 'Failed to update user suspension status' },
      { status: 500 }
    );
  }
}
