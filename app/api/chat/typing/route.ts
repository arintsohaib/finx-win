export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// POST - Update typing status
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
    const { sessionId, isTyping } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (isTyping) {
      // Create or update typing indicator (expires in 5 seconds)
      await prisma.chatTyping.deleteMany({
        where: {
          sessionId,
          senderType: 'user',
        },
      });
      
      await prisma.chatTyping.create({
        data: {
          sessionId,
          senderType: 'user',
          walletAddress: payload.walletAddress,
          expiresAt: new Date(Date.now() + 5000), // 5 seconds
        },
      });
    } else {
      // Remove typing indicator
      await prisma.chatTyping.deleteMany({
        where: {
          sessionId,
          senderType: 'user',
          walletAddress: payload.walletAddress,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}

// GET - Check typing status
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get typing indicators for admin (showing if admin is typing)
    const typingIndicators = await prisma.chatTyping.findMany({
      where: {
        sessionId,
        senderType: 'admin',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Clean up expired indicators
    await prisma.chatTyping.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isAdminTyping: typingIndicators.length > 0,
      },
    });

  } catch (error) {
    console.error('Check typing error:', error);
    return NextResponse.json({ error: 'Failed to check typing status' }, { status: 500 });
  }
}
