export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// GET all chat sessions for admin
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const assignedToMe = searchParams.get('assignedToMe') === 'true';

    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    if (assignedToMe) {
      where.assignedAdminId = admin.id;
    }

    // Fetch all sessions with KYC info and unread count
    const allSessions = await prisma.chatSession.findMany({
      where,
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            kycSubmissions: {
              select: {
                fullName: true,
                email: true,
                status: true,
              },
              orderBy: {
                submittedAt: 'desc',
              },
              take: 1,
            },
          },
        },
        messages: {
          where: {
            senderType: 'user',
            isRead: false,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // waiting first, then active, then closed
        { lastMessageAt: 'desc' },
      ],
    });

    // Group by wallet address to show most recent session per user
    const sessionsByWallet = new Map<string, typeof allSessions[0]>();
    
    for (const session of allSessions) {
      // If we haven't seen this wallet yet, or this session is more recent, use it
      const existing = sessionsByWallet.get(session.walletAddress);
      if (!existing || new Date(session.lastMessageAt) > new Date(existing.lastMessageAt)) {
        sessionsByWallet.set(session.walletAddress, session);
      }
    }

    // Convert map back to array and sort by status and time
    const sessions = Array.from(sessionsByWallet.values()).sort((a, b) => {
      // Sort by status priority: waiting > active > closed
      const statusOrder = { waiting: 0, active: 1, closed: 2 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 999;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 999;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Then by last message time (most recent first)
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    // Add unread count and extract KYC info
    const sessionsWithDetails = sessions.map((session: any) => {
      const kycInfo = session.user?.kycSubmissions?.[0];
      return {
        ...session,
        unreadCount: session.messages.length,
        messages: undefined, // Remove messages from response
        user: {
          ...session.user,
          fullName: kycInfo?.fullName || null,
          email: kycInfo?.email || null,
          kycStatus: kycInfo?.status || 'not_submitted',
          kycSubmissions: undefined, // Remove nested KYC data
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: sessionsWithDetails,
    });

  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
