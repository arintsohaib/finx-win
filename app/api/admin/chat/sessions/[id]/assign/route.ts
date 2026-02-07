export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { ROLES } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
// POST - Assign chat session to admin
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { adminId } = body;

    // Verify admin has permission (Super Admin can assign to anyone, Normal Admin only to themselves)
    if (admin.role !== ROLES.SUPER_ADMIN && adminId !== admin.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const session = await prisma.chatSession.update({
      where: {
        id: sessionId,
      },
      data: {
        assignedAdminId: adminId,
        status: 'active',
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: session.walletAddress,
        type: 'chat',
        title: 'Support Agent Assigned',
        message: 'A support agent has been assigned to your chat and will respond shortly.',
        link: '/chat',
      },
    });

    return NextResponse.json({
      success: true,
      data: session,
    });

  } catch (error) {
    console.error('Assign session error:', error);
    return NextResponse.json({ error: 'Failed to assign session' }, { status: 500 });
  }
}
