export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// GET - Get current admin info
export async function GET(req: NextRequest) {
  console.log('[API/admin/me] Checking auth...');
  const authResult = await requireAdmin(req);

  if ('error' in authResult) {
    console.warn('[API/admin/me] Auth failed:', authResult.error, 'Status:', authResult.status);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Update lastLogin to mark admin as active
  try {
    await prisma.admin.update({
      where: { id: authResult.admin.id },
      data: { lastLogin: new Date() },
    });
  } catch (error) {
    console.error('Failed to update admin lastLogin:', error);
  }

  return NextResponse.json({
    success: true,
    admin: {
      id: authResult.admin.id,
      username: authResult.admin.username,
      role: authResult.admin.role,
      permissions: authResult.admin.permissions,
    },
  });
}
