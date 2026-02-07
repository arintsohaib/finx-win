export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// POST - Mark user messages as seen by admin
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { sessionId, messageIds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

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
      // Mark all unseen messages from user as seen
      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderType: 'user',
          seen: false,
        },
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
    console.error('Admin mark seen error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as seen' }, { status: 500 });
  }
}
