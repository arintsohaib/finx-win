export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// POST - Mark messages as seen
export async function POST(request: NextRequest) {
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
    const { sessionId, messageIds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Mark all messages from the opposite sender as seen
    const updateData: any = {
      sessionId,
      seen: false,
    };

    // If user is marking messages as seen, mark admin messages
    updateData.senderType = 'admin';

    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as seen
      await prisma.chatMessage.updateMany({
        where: {
          id: { in: messageIds },
          sessionId,
        },
        data: {
          seen: true,
          isRead: true,
        },
      });
    } else {
      // Mark all unseen messages from admin as seen
      await prisma.chatMessage.updateMany({
        where: updateData,
        data: {
          seen: true,
          isRead: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Mark seen error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as seen' }, { status: 500 });
  }
}
