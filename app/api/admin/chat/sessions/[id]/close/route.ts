export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// POST - Close chat session
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id: sessionId } = await context.params;

    const session = await prisma.chatSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: 'admin',
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        walletAddress: session.walletAddress,
        type: 'chat',
        title: 'Chat Closed',
        message: 'Your support chat has been closed. Feel free to start a new chat if you need further assistance.',
        link: '/chat',
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
