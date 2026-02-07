export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    // Check if any admin is online (has logged in within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineAdmins = await prisma.admin.count({
      where: {
        lastLogin: {
          gte: fiveMinutesAgo,
        },
      },
    });

    // Check if agent is typing (typing indicator exists and not expired)
    const session = await prisma.chatSession.findFirst({
      where: {
        walletAddress: payload.walletAddress,
        status: 'active',
      },
    });

    let isTyping = false;
    if (session) {
      const typingIndicator = await prisma.chatTyping.findFirst({
        where: {
          sessionId: session.id,
          senderType: 'admin',
          expiresAt: {
            gte: new Date(),
          },
        },
      });
      isTyping = !!typingIndicator;
    }

    return NextResponse.json({
      success: true,
      data: {
        online: onlineAdmins > 0,
        typing: isTyping,
      },
    });

  } catch (error) {
    console.error('Agent status error:', error);
    return NextResponse.json({ error: 'Failed to check agent status' }, { status: 500 });
  }
}
