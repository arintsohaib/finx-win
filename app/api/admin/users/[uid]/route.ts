export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;
    const user = await prisma.user.findUnique({
      where: { uid },
      include: {
        balances: true,
        trades: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;
    const updates = await req.json();
    
    // Only allow specific fields to be updated
    const allowedUpdates: any = {};
    if (updates.tradeStatus !== undefined) {
      allowedUpdates.tradeStatus = updates.tradeStatus;
    }

    const user = await prisma.user.update({
      where: { uid },
      data: allowedUpdates,
    });

    // Log admin action
    console.log(`[ADMIN ACTION] User ${uid} updated:`, allowedUpdates);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
