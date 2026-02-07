export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// GET or create chat session for authenticated user
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

    // Get user data including UID and KYC status
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      include: {
        kycSubmissions: {
          where: { status: 'approved' },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to find an existing session by UID (persistent session)
    let session = await prisma.chatSession.findFirst({
      where: {
        userUid: user.uid,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Get verified name from KYC if approved
    const verifiedName = user.kycSubmissions[0]?.fullName || null;

    // Create new session ONLY if none exists for this UID
    if (!session) {
      console.log('[Chat Session API] Creating new session for user:', user.uid);
      session = await prisma.chatSession.create({
        data: {
          walletAddress: payload.walletAddress,
          userUid: user.uid,
          userName: verifiedName,
          status: 'waiting', // Waiting for admin to pick up
          lastMessageAt: new Date(),
        },
      });
      console.log('[Chat Session API] New session created:', session.id);
    } else if (verifiedName && session.userName !== verifiedName) {
      // Update session with verified name if KYC was recently approved
      session = await prisma.chatSession.update({
        where: { id: session.id },
        data: { userName: verifiedName },
      });
    }

    return NextResponse.json({
      success: true,
      data: session,
    });

  } catch (error) {
    console.error('[Chat Session API] Session error:', error);
    return NextResponse.json({
      error: 'Failed to manage session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST - Close chat session
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
    const { sessionId, rating, feedback } = body;

    const session = await prisma.chatSession.update({
      where: {
        id: sessionId,
        walletAddress: payload.walletAddress,
      },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: 'user',
        ...(rating && { rating }),
        ...(feedback && { ratingFeedback: feedback }),
      },
    });

    return NextResponse.json({
      success: true,
      data: session,
    });

  } catch (error) {
    console.error('Close session error:', error);
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 });
  }
}
