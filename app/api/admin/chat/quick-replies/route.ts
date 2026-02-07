export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { ROLES } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
// GET quick reply templates
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const quickReplies = await prisma.chatQuickReply.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: quickReplies,
    });

  } catch (error) {
    console.error('Fetch quick replies error:', error);
    return NextResponse.json({ error: 'Failed to fetch quick replies' }, { status: 500 });
  }
}

// POST - Create quick reply
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    // Only super admin can create quick replies
    if (admin.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, category, sortOrder = 0 } = body;

    const quickReply = await prisma.chatQuickReply.create({
      data: {
        title,
        message,
        category,
        sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      data: quickReply,
    });

  } catch (error) {
    console.error('Create quick reply error:', error);
    return NextResponse.json({ error: 'Failed to create quick reply' }, { status: 500 });
  }
}
