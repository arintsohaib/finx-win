export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;
    const body = await request.json();
    const { tradeStatus, tradeLimit } = body;

    const dataToUpdate: any = {};

    // Only update fields if they are provided
    if (tradeStatus !== undefined) {
      if (!['win', 'loss', 'automatic', 'custom'].includes(tradeStatus)) {
        return NextResponse.json(
          { error: 'Invalid trade status. Must be win, loss, automatic, or custom' },
          { status: 400 }
        );
      }
      dataToUpdate.tradeStatus = tradeStatus;
    }

    if (tradeLimit !== undefined) {
      const limit = parseInt(tradeLimit);
      if (isNaN(limit)) {
        return NextResponse.json(
          { error: 'Invalid trade limit. Must be a number.' },
          { status: 400 }
        );
      }
      dataToUpdate.tradeLimit = limit;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for update' },
        { status: 400 }
      );
    }

    // Find user by UID
    const user = await prisma.user.findUnique({
      where: { uid }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's trade status/limit
    const updatedUser = await prisma.user.update({
      where: { uid },
      data: dataToUpdate
    });

    // Emit real-time event
    realtimeEvents.emit(REALTIME_EVENTS.TRADE_UPDATED, {
      type: 'user_trade_settings_updated',
      uid: user.uid,
      tradeStatus: updatedUser.tradeStatus,
      tradeLimit: updatedUser.tradeLimit
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: updatedUser.uid,
        walletAddress: updatedUser.walletAddress,
        tradeStatus: updatedUser.tradeStatus,
        tradeLimit: updatedUser.tradeLimit
      }
    });

  } catch (error) {
    console.error('Update user trade status error:', error);
    return NextResponse.json(
      { error: 'Failed to update user trade status' },
      { status: 500 }
    );
  }
}
