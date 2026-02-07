export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
// POST - Update admin typing status
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

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
          senderType: 'admin',
        },
      });
      
      await prisma.chatTyping.create({
        data: {
          sessionId,
          senderType: 'admin',
          adminId: admin.id,
          expiresAt: new Date(Date.now() + 5000), // 5 seconds
        },
      });
    } else {
      // Remove typing indicator
      await prisma.chatTyping.deleteMany({
        where: {
          sessionId,
          senderType: 'admin',
          adminId: admin.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Admin typing indicator error:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}
