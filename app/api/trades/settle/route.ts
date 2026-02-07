export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { coinMarketCapService } from '@/lib/coinmarketcap';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { logActivity } from '@/lib/activity-logger';
import { settingsCache } from '@/lib/settings-cache';
// This endpoint should be called periodically to settle expired trades
export async function POST() {
  try {
    // OPTIMIZATION: Fetch global trade settings with caching (30-second TTL)
    // This prevents redundant DB queries every 1.5 seconds
    const globalSettingsObj = await settingsCache.get(
      'global_trade_settings',
      async () => {
        const globalSettings = await prisma.adminSettings.findMany({
          where: {
            key: {
              in: ['global_trade_mode', 'global_win_percentage', 'global_loss_percentage']
            }
          }
        });

        const settingsObj: any = {};
        globalSettings.forEach((setting: any) => {
          settingsObj[setting.key] = setting.value;
        });

        return settingsObj;
      },
      30000 // Cache for 30 seconds
    );

    const globalTradeMode = globalSettingsObj.global_trade_mode || 'disabled';
    const globalWinPercentage = parseFloat(globalSettingsObj.global_win_percentage || '2.5');
    const globalLossPercentage = parseFloat(globalSettingsObj.global_loss_percentage || '0.002');

    // Find all active trades that have expired
    const expiredTrades = await prisma.trade.findMany({
      where: {
        status: 'active',
        expiresAt: {
          lte: new Date()
        }
      },
      include: {
        user: {
          include: {
            kycSubmissions: {
              where: { status: 'approved' },
              select: { fullName: true, email: true },
              take: 1
            }
          }
        }
      }
    });

    const settledTrades: string[] = [];

    // OPTIMIZATION: Process trades in parallel batches instead of sequentially
    // Batch size of 10 to avoid overwhelming the database
    const BATCH_SIZE = 10;
    const settlementPromises: Promise<string | null>[] = [];

    for (const trade of expiredTrades) {
      // Create async function for each trade settlement
      const settleTrade = async (): Promise<string | null> => {
        try {
          // CRITICAL FIX: Double-check trade status atomically in the transaction
          // Transaction updateMany will handle the race condition check

          const entryPrice = parseFloat(trade.entryPrice.toString());
          const amountUsd = parseFloat(trade.amountUsd.toString());

          // Parse profit percentage from profitMultiplier (e.g., "10%" -> 10)
          const profitPercentage = parseFloat(trade.profitMultiplier.replace('%', ''));
          const profitLossAmount = amountUsd * (profitPercentage / 100);

          // Determine result and exit price based on manual preset, global settings, or individual user settings
          let result: 'win' | 'loss';
          let exitPrice: number;
          let calculatedPnl: number; // Declare at outer scope to use after transaction

          // CHECK FOR MANUAL OUTCOME PRESET FIRST
          // If admin has pre-set a WIN/LOSS outcome, use it
          if (trade.manualOutcomePreset) {
            console.log(`Trade ${trade.id} has manual preset: ${trade.manualOutcomePreset}`);
            result = trade.manualOutcomePreset.toLowerCase() as 'win' | 'loss';

            // Calculate exit price based on preset outcome
            if (result === 'win') {
              const winPercentage = globalWinPercentage / 100 || 0.025; // 2.5% default
              if (trade.side === 'buy') {
                exitPrice = entryPrice * (1 + winPercentage);
              } else {
                exitPrice = entryPrice * (1 - winPercentage);
              }
            } else {
              const lossPercentage = globalLossPercentage / 100 || 0.00002; // 0.002% default
              if (trade.side === 'buy') {
                exitPrice = entryPrice * (1 - lossPercentage);
              } else {
                exitPrice = entryPrice * (1 + lossPercentage);
              }
            }

            // Calculate PnL based on preset result
            if (result === 'win') {
              calculatedPnl = profitLossAmount;
            } else {
              calculatedPnl = -profitLossAmount;
            }

            // Skip the rest of the outcome determination logic
            // Jump to balance update section
          } else {
            // NO MANUAL PRESET - Use automatic logic

            // CRITICAL FIX: Separate "trade outcome control" from "price movement percentages"
            // - Trade outcome control: win/loss/automatic (determines IF user wins or loses)
            // - Price movement percentages: custom percentages (determines HOW MUCH price moves)

            let effectiveTradeStatus = trade.user.tradeStatus; // win, loss, automatic
            let effectiveWinPercentage = 0.01 + Math.random() * 0.04; // Default 1-5%
            let effectiveLossPercentage = 0.00002; // Default 0.002%

            if (globalTradeMode !== 'disabled') {
              // Global mode is enabled - check what type
              if (globalTradeMode === 'custom') {
                // CUSTOM mode: Use global custom percentages for price movement
                // BUT still respect individual user's win/loss/automatic setting
                effectiveWinPercentage = globalWinPercentage / 100; // Convert percentage to decimal
                effectiveLossPercentage = globalLossPercentage / 100;
                // effectiveTradeStatus remains as user's individual setting (NOT overridden)
              } else {
                // WIN, LOSS, or AUTOMATIC mode: Override user's setting completely
                effectiveTradeStatus = globalTradeMode;
              }
            } else {
              // Global mode is disabled - use individual user settings
              if (trade.user.tradeStatus === 'custom' && trade.user.customWinPercentage && trade.user.customLossPercentage) {
                // User has custom percentages configured
                effectiveWinPercentage = parseFloat(trade.user.customWinPercentage.toString()) / 100;
                effectiveLossPercentage = parseFloat(trade.user.customLossPercentage.toString()) / 100;
                // For individual custom mode, default to automatic outcome
                effectiveTradeStatus = 'automatic';
              }
            }

            const userTradeStatus = effectiveTradeStatus;

            if (userTradeStatus === 'win') {
              // Admin set to WIN - always win with configured price movement
              result = 'win';
              const priceVariation = effectiveWinPercentage;

              if (trade.side === 'buy') {
                // Buy wins when price goes up
                exitPrice = entryPrice * (1 + priceVariation);
              } else {
                // Sell wins when price goes down
                exitPrice = entryPrice * (1 - priceVariation);
              }
            } else if (userTradeStatus === 'loss') {
              // Admin set to LOSS - always lose with configured price movement
              result = 'loss';
              const minimalVariation = effectiveLossPercentage;

              if (trade.side === 'buy') {
                // Buy loses when price goes down slightly
                exitPrice = entryPrice * (1 - minimalVariation);
              } else {
                // Sell loses when price goes up slightly
                exitPrice = entryPrice * (1 + minimalVariation);
              }
            } else {
              // AUTOMATIC - use real market data from CoinMarketCap (with caching)
              const priceData = await coinMarketCapService.getPrice(trade.asset);

              if (!priceData) {
                console.error(`Unable to fetch price for ${trade.asset}`);
                return null; // Skip this trade - can't determine price
              }

              exitPrice = priceData.current_price;

              // Determine win/loss based on real market movement
              if (trade.side === 'buy') {
                // For buy: win if price went up
                result = exitPrice > entryPrice ? 'win' : 'loss';

                // ✨ If it's a tie, adjust exitPrice to justify the loss (looks more natural to users)
                if (exitPrice === entryPrice) {
                  exitPrice = entryPrice * (1 - effectiveLossPercentage);
                }
              } else {
                // For sell: win if price went down
                result = exitPrice < entryPrice ? 'win' : 'loss';

                // ✨ If it's a tie, adjust exitPrice to justify the loss (looks more natural to users)
                if (exitPrice === entryPrice) {
                  exitPrice = entryPrice * (1 + effectiveLossPercentage);
                }
              }
            }

            // Calculate PnL based on result (before transaction) - only for non-manual trades
            if (result === 'win') {
              calculatedPnl = profitLossAmount;
            } else {
              calculatedPnl = -profitLossAmount;
            }
          } // End of else block for non-manual preset trades

          // CRITICAL FIX: Perform balance update and trade status update in a single transaction
          // This prevents race conditions where the same trade could be settled multiple times
          await prisma.$transaction(async (tx: any) => {
            // Step 1: Update trade status with WHERE clause to ensure atomicity
            const updateResult = await tx.trade.updateMany({
              where: {
                id: trade.id,
                status: 'active' // Only update if STILL active
              },
              data: {
                status: 'finished',
                result,
                exitPrice,
                pnl: calculatedPnl,
                closedAt: new Date()
              }
            });

            // If no rows were updated, trade was already settled by another process
            if (updateResult.count === 0) {
              throw new Error('TRADE_ALREADY_SETTLED');
            }

            // Step 2: Update balance based on result
            if (result === 'win') {
              // User wins: return original amount + profit
              const returnAmount = amountUsd + profitLossAmount;

              await tx.balance.upsert({
                where: {
                  walletAddress_currency: {
                    walletAddress: trade.walletAddress,
                    currency: 'USDT'
                  }
                },
                update: {
                  amount: { increment: returnAmount },
                  realBalance: { increment: amountUsd },
                  realWinnings: { increment: profitLossAmount }
                },
                create: {
                  walletAddress: trade.walletAddress,
                  currency: 'USDT',
                  amount: returnAmount,
                  realBalance: amountUsd,
                  realWinnings: profitLossAmount,
                  frozenBalance: 0
                }
              });
            } else {
              // User loses: only lose the profit/loss percentage, return the rest
              const returnAmount = amountUsd - profitLossAmount;

              await tx.balance.upsert({
                where: {
                  walletAddress_currency: {
                    walletAddress: trade.walletAddress,
                    currency: 'USDT'
                  }
                },
                update: {
                  amount: { increment: returnAmount },
                  realBalance: { increment: returnAmount }
                },
                create: {
                  walletAddress: trade.walletAddress,
                  currency: 'USDT',
                  amount: returnAmount,
                  realBalance: returnAmount,
                  realWinnings: 0,
                  frozenBalance: 0
                }
              });
            }

            // Step 3: Create notification
            await tx.notification.create({
              data: {
                walletAddress: trade.walletAddress,
                type: 'trade',
                title: `🎯 Trade ${result === 'win' ? 'Won! 🎉' : 'Lost'}`,
                message: `Your ${trade.side.toUpperCase()} order for ${trade.asset} has ${result === 'win' ? 'won' : 'lost'}. ${result === 'win' ? 'Profit: +' : 'Loss: -'}${Math.abs(calculatedPnl).toFixed(2)} USDT`,
                link: '/profit-statistics?tab=finished',
                tradeId: trade.id
              }
            });
          });

          // Emit real-time event for instant notification
          realtimeEvents.emit(REALTIME_EVENTS.USER_NOTIFICATION, {
            walletAddress: trade.walletAddress,
            type: 'trade_settled',
            tradeId: trade.id,
            result,
            pnl: calculatedPnl,
            asset: trade.asset,
            side: trade.side
          });

          // Emit balance updated event so wallet page refreshes
          realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${trade.walletAddress}`, { walletAddress: trade.walletAddress });

          // ✨ NEW: Emit TRADE_SETTLED event for instant UI updates
          realtimeEvents.emit(REALTIME_EVENTS.TRADE_SETTLED, {
            tradeId: trade.id,
            walletAddress: trade.walletAddress,
            status: 'finished',
            outcome: result,
            pnl: calculatedPnl,
            asset: trade.asset,
            side: trade.side,
            exitPrice: exitPrice,
            settledAt: new Date().toISOString()
          });

          // Log activity for Live Overview
          const kycInfo = trade.user.kycSubmissions?.[0];
          await logActivity({
            walletAddress: trade.walletAddress,
            uid: trade.user.uid,
            userName: kycInfo?.fullName || undefined,
            userEmail: kycInfo?.email || undefined,
            activityType: 'TRADE_COMPLETED',
            activityCategory: 'TRADE',
            cryptoType: 'USDT', // Platform uses USDT for all trading
            amount: amountUsd,
            amountUsd: amountUsd,
            status: result === 'win' ? 'success' : 'failed',
            referenceId: trade.id,
            metadata: {
              asset: trade.asset, // Store the traded asset in metadata
              result,
              entryPrice: entryPrice.toString(),
              exitPrice: exitPrice.toString(),
              pnl: calculatedPnl.toString(),
              side: trade.side,
              duration: trade.duration
            }
          });

          settledTrades.push(trade.id);
          return trade.id;
        } catch (error) {
          // Skip trades that were already settled by another process
          if (error instanceof Error && error.message === 'TRADE_ALREADY_SETTLED') {
            console.log(`Trade ${trade.id} already settled, skipping`);
            return null;
          }
          console.error(`Error settling trade ${trade.id}:`, error);
          return null;
        }
      };

      settlementPromises.push(settleTrade());

      // Process in batches to avoid overwhelming the database
      if (settlementPromises.length >= BATCH_SIZE) {
        await Promise.all(settlementPromises);
        settlementPromises.length = 0; // Clear the array
      }
    }

    // Process remaining trades
    if (settlementPromises.length > 0) {
      await Promise.all(settlementPromises);
    }

    // Emit admin event if trades were settled
    if (settledTrades.length > 0) {
      realtimeEvents.emit(REALTIME_EVENTS.TRADE_UPDATED, {
        type: 'trades_updated',
        count: settledTrades.length
      });
    }

    return NextResponse.json({
      success: true,
      settledCount: settledTrades.length,
      settledTrades
    });

  } catch (error) {
    console.error('Trade settlement error:', error);
    return NextResponse.json(
      { error: 'Failed to settle trades' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual trigger or monitoring
export async function GET() {
  return POST();
}
