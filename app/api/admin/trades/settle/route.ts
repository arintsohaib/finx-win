export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
export async function POST(req: NextRequest) {
  try {
    const { tradeId, result } = await req.json();

    if (!tradeId || !result) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['win', 'loss'].includes(result)) {
      return NextResponse.json(
        { error: 'Invalid result' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Perform all validations and updates in a single transaction
    // This prevents race conditions where the same trade could be settled multiple times
    const settlementResult = await prisma.$transaction(async (tx: any) => {
      // Step 1: Fetch and validate trade inside transaction
      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
        include: { user: true },
      });

      if (!trade) {
        throw new Error('TRADE_NOT_FOUND');
      }

      if (trade.status !== 'active') {
        throw new Error('TRADE_ALREADY_SETTLED');
      }

      // Step 2: Calculate exit price and P&L
      const entryPrice = parseFloat(trade.entryPrice.toString());
      
      let exitPrice: number;
      if (result === 'win') {
        // Price moved in favor of the trade (1-5% variation)
        const priceVariation = 0.01 + Math.random() * 0.04; // 1-5% price change
        exitPrice = trade.side === 'buy' 
          ? entryPrice * (1 + priceVariation)  // Buy wins when price goes up
          : entryPrice * (1 - priceVariation); // Sell wins when price goes down
      } else {
        // Price moved against the trade with MINIMAL variation (0.002%)
        const minimalVariation = 0.00002; // 0.002% price change
        exitPrice = trade.side === 'buy'
          ? entryPrice * (1 - minimalVariation)  // Buy loses when price goes down slightly
          : entryPrice * (1 + minimalVariation); // Sell loses when price goes up slightly
      }

      const amountUsd = parseFloat(trade.amountUsd.toString());
      const profitMultiplierValue = parseFloat(trade.profitMultiplier.replace('%', '')) / 100;
      
      let pnl: number;
      if (result === 'win') {
        pnl = amountUsd * profitMultiplierValue; // User wins the multiplier percentage
      } else {
        pnl = -amountUsd; // User loses the invested amount
      }

      // Step 3: Update trade status with WHERE clause to ensure atomicity
      const updateResult = await tx.trade.updateMany({
        where: {
          id: tradeId,
          status: 'active' // Only update if STILL active
        },
        data: {
          status: 'finished',
          result,
          closedAt: new Date(),
          exitPrice: new Decimal(exitPrice),
          pnl: new Decimal(pnl),
        },
      });

      // If no rows were updated, trade was already settled
      if (updateResult.count === 0) {
        throw new Error('TRADE_ALREADY_SETTLED');
      }

      // Step 4: Create notification
      const notificationTitle = result === 'win' ? '🎉 Trade Won!' : '📉 Trade Closed';
      const notificationMessage = result === 'win'
        ? `Congratulations! Your ${trade.asset} ${trade.side.toUpperCase()} trade won. Profit: $${Math.abs(pnl).toFixed(2)}`
        : `Your ${trade.asset} ${trade.side.toUpperCase()} trade closed with a loss of $${Math.abs(pnl).toFixed(2)}`;

      await tx.notification.create({
        data: {
          walletAddress: trade.walletAddress,
          type: 'trade',
          title: notificationTitle,
          message: notificationMessage,
          link: '/profit-statistics?tab=finished',
        },
      });

      return { trade, exitPrice, pnl };
    });

    // Log admin action
    console.log(`[ADMIN ACTION] Trade ${tradeId} settled as ${result} for user ${settlementResult.trade.user.uid}`);

    return NextResponse.json({ 
      success: true,
      message: `Trade settled as ${result}`,
      data: {
        exitPrice: settlementResult.exitPrice,
        pnl: settlementResult.pnl,
      },
    });
  } catch (error) {
    console.error('Error settling trade:', error);
    
    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === 'TRADE_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Trade not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'TRADE_ALREADY_SETTLED') {
        return NextResponse.json(
          { error: 'Trade already settled' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to settle trade' },
      { status: 500 }
    );
  }
}
