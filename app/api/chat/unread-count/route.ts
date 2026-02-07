export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// GET - Get unread message count for user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's active sessions
    const sessions = await prisma.chatSession.findMany({
      where: {
        walletAddress: payload.walletAddress,
        status: { in: ['active', 'waiting'] },
      },
      select: {
        id: true,
      },
    });

    const sessionIds = sessions.map((s: any) => s.id);

    // Count unread admin messages
    const unreadCount = await prisma.chatMessage.count({
      where: {
        sessionId: { in: sessionIds },
        senderType: 'admin',
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
      },
    });

  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ error: 'Failed to get unread count' }, { status: 500 });
  }
}
