export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: tradeId } = await context.params;
    const body = await req.json();
    const { result, adminId, adminUsername } = body;

    // Validate result
    if (!['win', 'loss'].includes(result.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid result. Must be "win" or "loss"' },
        { status: 400 }
      );
    }

    // Fetch the trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        user: {
          select: {
            walletAddress: true,
            uid: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }

    // Check if trade is active
    if (trade.status !== 'active') {
      return NextResponse.json(
        { error: 'Trade is not active. Only active trades can be manually closed.' },
        { status: 400 }
      );
    }

    // Fetch global trade settings for percentages
    const settings = await prisma.adminSettings.findMany({
      where: {
        key: {
          in: ['global_win_percentage', 'global_loss_percentage'],
        },
      },
    });

    const settingsObj: any = {};
    settings.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });

    const globalWinPercentage = parseFloat(settingsObj.global_win_percentage || '2.5');
    const globalLossPercentage = parseFloat(settingsObj.global_loss_percentage || '0.002');

    // Calculate exit price based on result and global percentages
    const entryPrice = parseFloat(trade.entryPrice.toString());
    let exitPrice: number;
    let pnl: number;
    let finalResult: string;

    if (result.toLowerCase() === 'win') {
      // WIN: Entry + (Entry * winPercent / 100)
      const priceMovement = entryPrice * (globalWinPercentage / 100);
      exitPrice = entryPrice + priceMovement;

      // Calculate P/L: amount * (winPercent / 100)
      const amountUsd = parseFloat(trade.amountUsd.toString());
      pnl = amountUsd * (globalWinPercentage / 100);
      finalResult = 'WIN';
    } else {
      // LOSS: Entry - (Entry * lossPercent / 100)
      const priceMovement = entryPrice * (globalLossPercentage / 100);
      exitPrice = entryPrice - priceMovement;

      // Calculate P/L: -amount * (lossPercent / 100)
      const amountUsd = parseFloat(trade.amountUsd.toString());
      pnl = -(amountUsd * (globalLossPercentage / 100));
      finalResult = 'LOSS';
    }

    // Update trade
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'finished',
        result: finalResult,
        exitPrice: exitPrice,
        pnl: pnl,
        closedAt: new Date(),
      },
    });

    // Update user balance (add P/L to USDT balance)
    await prisma.balance.update({
      where: {
        walletAddress_currency: {
          walletAddress: trade.walletAddress,
          currency: 'USDT',
        },
      },
      data: {
        amount: {
          increment: pnl,
        },
        // Update realBalance or realWinnings based on result
        ...(pnl > 0
          ? { realWinnings: { increment: pnl } }
          : { realBalance: { increment: pnl } }),
      },
    });

    // Log admin action to activity log
    await prisma.activityLog.create({
      data: {
        walletAddress: trade.walletAddress,
        uid: trade.user.uid,
        activityType: 'TRADE',
        activityCategory: 'ADMIN',
        cryptoType: trade.asset,
        amount: parseFloat(trade.amountUsd.toString()).toString(),
        amountUsd: pnl.toString(),
        status: 'success',
        referenceId: trade.id,
        metadata: JSON.stringify({
          action: 'MANUAL_TRADE_RESULT',
          tradeId: trade.id,
          asset: trade.asset,
          side: trade.side,
          entryPrice: entryPrice,
          exitPrice: exitPrice,
          result: finalResult,
          pnl: pnl,
          appliedPercentage: result.toLowerCase() === 'win' ? globalWinPercentage : globalLossPercentage,
          setBy: adminUsername || 'Unknown Admin',
          adminId: adminId || 'SYSTEM',
          timestamp: new Date().toISOString(),
        }),
      },
    });

    console.log(
      `[ADMIN MANUAL CONTROL] Trade ${tradeId} set to ${finalResult} by ${adminUsername || 'Admin'} | User: ${trade.user.uid} | Asset: ${trade.asset} | Entry: $${entryPrice} | Exit: $${exitPrice.toFixed(2)} | P/L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT | Applied: ${result.toLowerCase() === 'win' ? globalWinPercentage : globalLossPercentage}%`
    );

    return NextResponse.json({
      success: true,
      message: `Trade manually set to ${finalResult}`,
      trade: {
        id: updatedTrade.id,
        status: updatedTrade.status,
        result: updatedTrade.result,
        exitPrice: updatedTrade.exitPrice,
        pnl: updatedTrade.pnl,
        closedAt: updatedTrade.closedAt,
      },
      appliedSettings: {
        percentage: result.toLowerCase() === 'win' ? globalWinPercentage : globalLossPercentage,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        pnl: pnl,
      },
    });
  } catch (error) {
    console.error('[ADMIN MANUAL CONTROL] Error setting trade result:', error);
    return NextResponse.json(
      { error: 'Failed to set trade result' },
      { status: 500 }
    );
  }
}
