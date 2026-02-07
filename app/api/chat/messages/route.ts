export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// GET - Fetch chat messages for authenticated user with pagination
export async function GET(request: NextRequest) {
  console.log('[Chat API] GET messages request received');
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Message ID to fetch before (for loading older messages)

    // Get user's session by UID
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        userUid: user.uid,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    let messages: any[] = [];
    let hasMore = false;

    if (session) {
      // Build query for pagination
      const whereClause: any = {
        sessionId: session.id,
      };

      // If 'before' is provided, get messages before that message
      if (before) {
        const beforeMessage = await prisma.chatMessage.findUnique({
          where: { id: before },
        });
        if (beforeMessage) {
          whereClause.createdAt = {
            lt: beforeMessage.createdAt,
          };
        }
      }

      // Fetch messages with pagination
      messages = await prisma.chatMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }, // Get newest first, then reverse
        take: limit + 1, // Fetch one extra to check if there are more
      });

      // Check if there are more messages
      hasMore = messages.length > limit;
      if (hasMore) {
        messages = messages.slice(0, limit);
      }

      // Reverse to show oldest first
      messages.reverse();

      // Mark admin messages as read and seen
      const unreadMessageIds = messages
        .filter((m: any) => m.senderType === 'admin' && !m.isRead)
        .map((m: any) => m.id);

      if (unreadMessageIds.length > 0) {
        await prisma.chatMessage.updateMany({
          where: {
            id: { in: unreadMessageIds },
          },
          data: {
            isRead: true,
            seen: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        messages,
        hasMore,
        session,
      },
    });

  } catch (error) {
    console.error('Fetch chat messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a chat message
export async function POST(request: NextRequest) {
  console.log('[Chat API] POST request received');
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      senderType = 'user',
      sessionId,
      messageType = 'text',
      fileUrl = null,
      fileName = null,
    } = body;

    if (!message && !fileUrl) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    // Get or create session for user
    let activeSession;
    if (sessionId) {
      activeSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
    }

    if (!activeSession && senderType === 'user') {
      // Create new session
      activeSession = await prisma.chatSession.create({
        data: {
          walletAddress: payload.walletAddress,
          status: 'waiting',
        },
      });
    }

    console.log('[Chat API] Sending message:', {
      walletAddress: payload.walletAddress,
      sessionId,
      senderType,
      message: message?.substring(0, 20)
    });

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId: activeSession?.id || sessionId,
        walletAddress: senderType === 'admin' ? null : payload.walletAddress,
        senderType,
        message: message || `Sent a ${messageType}`,
        messageType,
        fileUrl,
        fileName,
        isRead: false,
        delivered: true,
        seen: false,
      },
    });

    console.log('[Chat API] Message created:', chatMessage.id);

    // Update session lastMessageAt
    if (activeSession) {
      await prisma.chatSession.update({
        where: { id: activeSession.id },
        data: {
          lastMessageAt: new Date(),
          status: senderType === 'user' ? 'waiting' : 'active',
        },
      });
      console.log('[Chat API] Session updated:', activeSession.id);
    }

    // Create notification for admin messages
    if (senderType === 'admin' && payload.walletAddress) {
      await prisma.notification.create({
        data: {
          walletAddress: payload.walletAddress,
          type: 'chat',
          title: 'New Message from Support',
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          link: '/chat',
        },
      });
      console.log('[Chat API] Notification created for user:', payload.walletAddress);
    }

    return NextResponse.json({
      success: true,
      data: chatMessage,
    });

  } catch (error) {
    console.error('[Chat API] Send message error:', error);
    return NextResponse.json({
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
