export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminAuth, PERMISSIONS, hasPermission } from '@/lib/admin-auth';
import { coinMarketCapService } from '@/lib/coinmarketcap';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authentication
    const admin = await verifyAdminAuth(req);
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    // 2. Check permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const { walletAddress, currency, amountUsdt, note } = body;

    // 4. Validate inputs
    if (!walletAddress || !currency || !amountUsdt || amountUsdt <= 0) {
      return NextResponse.json(
        { error: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    // 5. Verify user exists
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { walletAddress: true, uid: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 6. Fetch live conversion rate from CoinMarketCap
    const priceData = await coinMarketCapService.getPrice(currency);
    if (!priceData || !priceData.current_price) {
      return NextResponse.json(
        { error: 'Unable to fetch live conversion rate' },
        { status: 500 }
      );
    }

    const conversionRate = priceData.current_price;
    const cryptoAmount = amountUsdt / conversionRate;

    // 7. Verify or create balance record
    let balance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress,
          currency,
        },
      },
    });

    if (!balance) {
      // Create new balance record if doesn't exist
      balance = await prisma.balance.create({
        data: {
          walletAddress,
          currency,
          amount: 0,
          realBalance: 0,
          realWinnings: 0,
          frozenBalance: 0,
        },
      });
    }

    // 8. Calculate new balance
    const currentBalance = parseFloat(balance.amount.toString());
    const newBalance = currentBalance + cryptoAmount;

    // 9. Update balance in database (transaction for atomicity)
    const updatedBalance = await prisma.$transaction(async (tx: any) => {
      // Update balance
      const updated = await tx.balance.update({
        where: {
          walletAddress_currency: {
            walletAddress,
            currency,
          },
        },
        data: {
          amount: newBalance,
          // Also update realBalance to reflect this as real funds
          realBalance: {
            increment: cryptoAmount,
          },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          walletAddress,
          uid: user.uid,
          activityType: 'ADMIN_BALANCE_ADJUSTMENT',
          activityCategory: 'BALANCE_ADD',
          cryptoType: currency,
          amount: cryptoAmount,
          amountUsd: amountUsdt,
          status: 'completed',
          metadata: JSON.stringify({
            currency,
            amountUsdt,
            cryptoAmount,
            conversionRate,
            previousBalance: currentBalance,
            newBalance,
            adminId: admin.id,
            adminUsername: admin.username,
            note: note || 'No reason provided',
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return updated;
    });

    // 10. Calculate total portfolio value in USDT
    const allBalances = await prisma.balance.findMany({
      where: { walletAddress },
    });

    let totalPortfolioUsdt = 0;
    for (const bal of allBalances) {
      const balCurrency = bal.currency;
      const balAmount = parseFloat(bal.amount.toString());
      
      if (balCurrency === 'USDT') {
        totalPortfolioUsdt += balAmount;
      } else {
        const balPrice = await coinMarketCapService.getPrice(balCurrency);
        if (balPrice && balPrice.current_price) {
          totalPortfolioUsdt += balAmount * balPrice.current_price;
        }
      }
    }

    // 11. Emit real-time event for instant sync
    realtimeEvents.emit(REALTIME_EVENTS.USER_BALANCE_UPDATED, {
      walletAddress,
      currency,
      newBalance,
      totalPortfolioUsdt,
      action: 'ADD',
      amountUsdt,
      cryptoAmount,
      conversionRate,
    });

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully added ${amountUsdt} USDT (${cryptoAmount.toFixed(8)} ${currency}) at rate ${conversionRate.toFixed(2)} USDT/${currency}`,
      data: {
        walletAddress,
        currency,
        amountUsdt,
        cryptoAmount,
        conversionRate,
        previousBalance: currentBalance,
        newBalance,
        totalPortfolioUsdt,
        updatedAt: updatedBalance.updatedAt,
      },
    });

  } catch (error: any) {
    console.error('Error adding balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add balance' },
      { status: 500 }
    );
  }
}
