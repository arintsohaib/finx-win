export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// POST - Send message from admin to user
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const body = await request.json();
    const {
      sessionId,
      message,
      messageType = 'text',
      fileUrl = null,
      fileName = null,
    } = body;

    if (!message && !fileUrl) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    // Get session to get user wallet address
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        walletAddress: null, // Admin messages have null walletAddress
        adminId: admin.id,
        senderType: 'admin',
        message: message || `Sent a ${messageType}`,
        messageType,
        fileUrl,
        fileName,
        isRead: false,
        delivered: true, // Mark as delivered immediately
        seen: false,
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        status: 'active',
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: session.walletAddress,
        type: 'chat',
        title: 'New Message from Support',
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        // No link needed - chat notifications open the modal via notification handler
      },
    });

    return NextResponse.json({
      success: true,
      data: chatMessage,
    });

  } catch (error) {
    console.error('Send admin message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
