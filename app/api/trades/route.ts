export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validatePriceForTrading } from '@/lib/multi-source-price-fetcher';
import { logActivity } from '@/lib/activity-logger';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
// Helper function to update USDT balance
async function updateBalance(
  walletAddress: string,
  amount: number,
  operation: 'add' | 'subtract'
) {
  const balance = await prisma.balance.findFirst({
    where: {
      walletAddress,
      currency: 'USDT'
    }
  });

  if (!balance && operation === 'subtract') {
    throw new Error('Insufficient balance');
  }

  if (operation === 'subtract') {
    // Check available balance (realBalance + realWinnings)
    const available = parseFloat(balance!.realBalance.toString()) + parseFloat(balance!.realWinnings.toString());
    if (available < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct from realBalance first, then realWinnings if needed
    const realBalanceNum = parseFloat(balance!.realBalance.toString());
    if (realBalanceNum >= amount) {
      await prisma.balance.update({
        where: { id: balance!.id },
        data: {
          realBalance: { decrement: amount },
          amount: { decrement: amount }
        }
      });
    } else {
      const remaining = amount - realBalanceNum;
      await prisma.balance.update({
        where: { id: balance!.id },
        data: {
          realBalance: 0,
          realWinnings: { decrement: remaining },
          amount: { decrement: amount }
        }
      });
    }
  } else {
    // Add to realWinnings (profits)
    if (balance) {
      await prisma.balance.update({
        where: { id: balance.id },
        data: {
          realWinnings: { increment: amount },
          amount: { increment: amount }
        }
      });
    } else {
      await prisma.balance.create({
        data: {
          walletAddress,
          currency: 'USDT',
          amount,
          realWinnings: amount
        }
      });
    }
  }
}

// Create new trade
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { asset, side, amountUsd, duration, profitMultiplier } = await request.json();

    // Validate inputs
    if (!asset || !side || !amountUsd || !duration || !profitMultiplier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info and trade limit
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
      select: {
        uid: true,
        tradeLimit: true,
        kycSubmissions: {
          where: { status: 'approved' },
          select: { fullName: true, email: true },
          take: 1
        },
        _count: {
          select: { trades: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Enforce Trade Limit (Remaining Trades Model)
    if (user.tradeLimit !== undefined && user.tradeLimit <= 0) {
      return NextResponse.json(
        { error: 'Failed to place trade. Please contact support.' },
        { status: 403 }
      );
    }


    // Get asset trading settings (check if asset exists and is enabled)
    const assetSettings = await prisma.assetTradingSettings.findUnique({
      where: { assetSymbol: asset.toUpperCase() }
    });

    if (!assetSettings) {
      return NextResponse.json(
        { error: 'Trading not configured for this asset' },
        { status: 400 }
      );
    }

    if (!assetSettings.isEnabled) {
      return NextResponse.json(
        { error: 'Trading is disabled for this asset' },
        { status: 403 }
      );
    }

    // Get global settings (delivery times and profit levels)
    const globalSettings = await prisma.globalAssetSettings.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // ... (rest of the validation logic continues)

    if (globalSettings.length === 0) {
      return NextResponse.json(
        { error: 'Global trading settings not configured. Please contact admin.' },
        { status: 500 }
      );
    }

    // Find settings matching the requested duration and profit multiplier
    const matchingSettings = globalSettings.filter((s: any) => s.deliveryTime === duration);

    // ... (rest of the validation logic continues)

    if (matchingSettings.length === 0) {
      return NextResponse.json(
        { error: 'Invalid delivery time' },
        { status: 400 }
      );
    }

    // Parse profit multiplier from string (e.g., "10%" -> 10)
    const requestedProfit = parseFloat(profitMultiplier.replace('%', ''));

    // Find the exact matching setting
    const matchingSetting = matchingSettings.find((s: any) =>
      parseFloat(s.profitLevel.toString()) === requestedProfit
    );

    if (!matchingSetting) {
      return NextResponse.json(
        { error: 'Invalid profit level for this delivery time' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountUsd);
    const minAmount = parseFloat(matchingSetting.minUsdt.toString());

    // Validate minimum amount
    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum trade amount is ${minAmount} USDT for this profit level` },
        { status: 400 }
      );
    }

    // Note: No maximum amount restriction - users can trade any amount >= minUsdt

    // Check user balance
    const balance = await prisma.balance.findFirst({
      where: {
        walletAddress: payload.walletAddress,
        currency: 'USDT'
      }
    });

    if (!balance) {
      return NextResponse.json(
        { error: 'No USDT balance found. Please deposit first.' },
        { status: 400 }
      );
    }

    // Calculate available balance (use amount field - what user sees on wallet page)
    const amountNum = parseFloat(balance.amount.toString());
    const frozenBalanceNum = parseFloat(balance.frozenBalance.toString());
    const availableBalance = amountNum - frozenBalanceNum;

    // No trading fees
    const fee = 0;
    const totalRequired = amount;

    if (availableBalance < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. Required: ${totalRequired.toFixed(2)} USDT, Available: ${availableBalance.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Get current price using multi-source validation
    // This ensures we NEVER use stale/fallback prices for trade execution
    console.log(`🔍 Fetching LIVE price for ${asset} trade execution...`);
    const priceValidation = await validatePriceForTrading(asset);

    if (!priceValidation.isValid || !priceValidation.price) {
      console.error('❌ Price validation failed for asset:', asset, priceValidation.error);
      return NextResponse.json(
        { error: priceValidation.error || 'Unable to fetch real-time price. Please try again.' },
        { status: 503 } // Service Unavailable - all price APIs failed
      );
    }

    const entryPrice = priceValidation.price.price;
    const priceSource = priceValidation.price.source;
    const priceAge = Date.now() - priceValidation.price.timestamp;

    console.log(`✅ Price validated for trade: ${asset} = $${entryPrice} (Source: ${priceSource}, Age: ${priceAge}ms)`);

    // Calculate expiry time - Dynamic parsing of duration string
    const now = new Date();
    let expiresAt = new Date(now);

    // Parse duration dynamically (e.g., "30s", "60s", "5m", "15m", "1h", "1d")
    const durationMatch = duration.match(/^(\d+)(s|m|h|d)$/);

    if (!durationMatch) {
      console.error(`Invalid duration format: ${duration}`);
      return NextResponse.json(
        { error: 'Invalid duration format. Use format like: 30s, 5m, 1h, 1d' },
        { status: 400 }
      );
    }

    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2];

    switch (unit) {
      case 's': // seconds
        expiresAt.setSeconds(expiresAt.getSeconds() + value);
        break;
      case 'm': // minutes
        expiresAt.setMinutes(expiresAt.getMinutes() + value);
        break;
      case 'h': // hours
        expiresAt.setHours(expiresAt.getHours() + value);
        break;
      case 'd': // days
        expiresAt.setDate(expiresAt.getDate() + value);
        break;
    }

    console.log(`✅ Trade duration: ${duration} -> Expires at: ${expiresAt.toISOString()}`);

    // Get profit percentage from the matched global setting
    const profitPercentage = parseFloat(matchingSetting.profitLevel.toString());

    // Execute trade creation, balance deduction, and limit decrement in a transaction
    const [trade] = await prisma.$transaction([
      // 1. Create trade
      prisma.trade.create({
        data: {
          walletAddress: payload.walletAddress,
          asset: asset.toUpperCase(),
          side,
          entryPrice,
          amountUsd: amount,
          duration,
          profitMultiplier: `${profitPercentage}%`,
          fee,
          expiresAt
        }
      }),
      // 2. Deduct balance (CRITICAL: Must decrement both realBalance AND amount)
      prisma.balance.updateMany({
        where: {
          walletAddress: payload.walletAddress,
          currency: 'USDT'
        },
        data: {
          realBalance: { decrement: totalRequired },
          amount: { decrement: totalRequired }
        }
      }),
      // 3. Decrement trade limit (Remaining trades model)
      prisma.user.update({
        where: { walletAddress: payload.walletAddress },
        data: {
          tradeLimit: { decrement: 1 }
        }
      })
    ]);

    const kycInfo = user?.kycSubmissions?.[0];

    // Log activity for Live Overview
    await logActivity({
      walletAddress: payload.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'TRADE_CREATED',
      activityCategory: 'TRADE',
      cryptoType: 'USDT', // Platform uses USDT for all trading
      amount: amount,
      amountUsd: amount,
      status: 'success',
      referenceId: trade.id,
      metadata: {
        asset: asset.toUpperCase(),
        side,
        entryPrice: entryPrice.toString(),
        duration,
        profitMultiplier: `${profitPercentage}%`,
        priceSource,
        expiresAt: expiresAt.toISOString()
      }
    });

    // Notify admin dashboard in real-time
    realtimeEvents.emit(REALTIME_EVENTS.TRADE_CREATED, {
      id: trade.id,
      type: 'TRADE',
      timestamp: trade.createdAt,
      userId: user.uid,
      userName: kycInfo?.fullName || `UID ${user?.uid}`,
      walletAddress: payload.walletAddress,
      employeeName: 'Unassigned', // Assigned employee logic can be added later if needed
      tradeType: trade.side.toUpperCase(),
      asset: trade.asset,
      entryPrice: parseFloat(trade.entryPrice.toString()),
      amount: parseFloat(trade.amountUsd.toString()),
      openedAt: trade.createdAt,
      expiresAt: trade.expiresAt,
      status: trade.status,
      referenceId: trade.id,
      duration: trade.duration, // Include duration for the new UI
    });

    // ✨ NEW: Emit detailed balance update event for the user
    // This triggers "Total Portfolio Value" and "Trading Balance" updates on the frontend
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, {
      walletAddress: payload.walletAddress,
      tradeId: trade.id,
      amountDeducted: totalRequired,
      reason: 'TRADE_CREATED'
    });

    return NextResponse.json({
      success: true,
      trade: {
        id: trade.id,
        asset: trade.asset,
        side: trade.side,
        entryPrice: trade.entryPrice.toString(),
        amountUsd: trade.amountUsd.toString(),
        duration: trade.duration,
        profitMultiplier: trade.profitMultiplier,
        fee: trade.fee.toString(),
        status: trade.status,
        result: trade.result,
        createdAt: trade.createdAt,
        expiresAt: trade.expiresAt,
        priceSource: priceSource, // Show which API provided the price
        priceAge: `${priceAge}ms` // Show how fresh the price is
      }
    });

  } catch (error: any) {
    console.error('Trade creation error:', error);

    // Provide more specific error messages
    if (error.message === 'Insufficient balance') {
      return NextResponse.json(
        { error: 'Insufficient balance to place trade' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create trade' },
      { status: 500 }
    );
  }
}

// Get user trades
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const whereClause: any = {
      walletAddress: payload.walletAddress
    };

    if (status) {
      whereClause.status = status;
    }

    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const serializedTrades = trades.map((trade: any) => ({
      id: trade.id,
      asset: trade.asset,
      side: trade.side,
      entryPrice: trade.entryPrice.toString(),
      amountUsd: trade.amountUsd.toString(),
      duration: trade.duration,
      profitMultiplier: trade.profitMultiplier,
      fee: trade.fee.toString(),
      status: trade.status,
      result: trade.result,
      createdAt: trade.createdAt,
      expiresAt: trade.expiresAt,
      closedAt: trade.closedAt,
      exitPrice: trade.exitPrice?.toString() || null,
      pnl: trade.pnl?.toString() || null
    }));

    return NextResponse.json({
      success: true,
      trades: serializedTrades
    });

  } catch (error) {
    console.error('Trades fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
