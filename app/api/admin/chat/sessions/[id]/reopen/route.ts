export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { ROLES } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
// POST - Reopen a closed chat session
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await context.params;
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    // const sessionId = params.id; // Corrected and handled at top

    // Check if admin has permission (all roles can reopen: EMPLOYEE, ADMIN, SUPER_ADMIN)
    const allowedRoles = [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    if (!allowedRoles.includes(admin.role)) {
      return NextResponse.json({
        error: 'Insufficient permissions to reopen chats'
      }, { status: 403 });
    }

    // Find the session
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Check if already active
    if (session.status !== 'closed') {
      return NextResponse.json({
        error: 'Chat session is already active or waiting'
      }, { status: 400 });
    }

    // Reopen the chat session
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        assignedAdminId: admin.id,
        lastMessageAt: new Date(),
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: session.walletAddress,
        type: 'chat_reopened',
        title: 'Chat Reopened',
        message: 'An admin has reopened your support chat. Please check your messages.',
        link: '/chat',
        isRead: false,
      },
    });

    // Send system message to chat
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        walletAddress: null,
        adminId: admin.id,
        senderType: 'admin',
        message: `Chat has been reopened by Support Team. How can we help you further?`,
        messageType: 'text',
        isRead: false,
        delivered: true,
        seen: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Chat session reopened successfully',
      data: updatedSession,
    });

  } catch (error) {
    console.error('Reopen chat error:', error);
    return NextResponse.json({
      error: 'Failed to reopen chat session'
    }, { status: 500 });
  }
}
