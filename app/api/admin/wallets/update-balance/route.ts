export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminAuth, PERMISSIONS, hasPermission } from '@/lib/admin-auth';
import { coinMarketCapService } from '@/lib/coinmarketcap';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
export async function PATCH(req: NextRequest) {
  try {
    // 1. Verify admin authentication
    const admin = await verifyAdminAuth(req);
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    // 2. Check permission (only Super Admin can edit balances)
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can edit balances' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const { walletAddress, uid, currency, newBalance, oldBalance } = body;

    // 4. Validate inputs
    if (!walletAddress || !currency || newBalance === undefined || newBalance < 0) {
      return NextResponse.json(
        { error: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    const newBalanceNum = parseFloat(newBalance);
    const oldBalanceNum = parseFloat(oldBalance || 0);

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

    // 6. Determine action type (add/remove) based on difference
    const difference = newBalanceNum - oldBalanceNum;
    const actionType = difference > 0 ? 'ADD' : difference < 0 ? 'REMOVE' : 'NONE';
    const changeAmount = Math.abs(difference);

    if (actionType === 'NONE') {
      return NextResponse.json(
        { success: true, message: 'No changes detected', data: { actionType: 'NONE' } },
        { status: 200 }
      );
    }

    // 7. Fetch live conversion rate from CoinMarketCap
    const priceData = await coinMarketCapService.getPrice(currency);
    if (!priceData || !priceData.current_price) {
      return NextResponse.json(
        { error: 'Unable to fetch live conversion rate' },
        { status: 500 }
      );
    }

    const conversionRate = priceData.current_price;
    const changeAmountUsdt = changeAmount * conversionRate;

    // 8. Verify or create balance record
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

    const currentRealBalance = parseFloat(balance.realBalance.toString());

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
          amount: newBalanceNum,
          // Update realBalance based on action type
          realBalance: actionType === 'ADD'
            ? { increment: changeAmount }
            : { decrement: Math.min(changeAmount, currentRealBalance) },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          walletAddress,
          uid: user.uid,
          activityType: 'ADMIN_BALANCE_ADJUSTMENT',
          activityCategory: actionType === 'ADD' ? 'BALANCE_ADD' : 'BALANCE_REMOVE',
          cryptoType: currency,
          amount: changeAmount,
          amountUsd: changeAmountUsdt,
          status: 'completed',
          metadata: JSON.stringify({
            currency,
            changeAmount,
            changeAmountUsdt,
            conversionRate,
            previousBalance: oldBalanceNum,
            newBalance: newBalanceNum,
            actionType,
            adminId: admin.id,
            adminUsername: admin.username,
            note: `Balance edited via inline edit. ${actionType === 'ADD' ? 'Added' : 'Removed'} ${changeAmount.toFixed(8)} ${currency} (≈ $${changeAmountUsdt.toFixed(2)})`,
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
      newBalance: newBalanceNum,
      totalPortfolioUsdt,
      action: actionType,
      changeAmount,
      changeAmountUsdt,
      conversionRate,
    });

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully ${actionType === 'ADD' ? 'added' : 'removed'} ${changeAmount.toFixed(8)} ${currency} (≈ $${changeAmountUsdt.toFixed(2)}) @ ${conversionRate.toFixed(2)} USDT/${currency}`,
      data: {
        walletAddress,
        currency,
        actionType,
        changeAmount,
        changeAmountUsdt,
        conversionRate,
        previousBalance: oldBalanceNum,
        newBalance: newBalanceNum,
        totalPortfolioUsdt,
        updatedAt: updatedBalance.updatedAt,
      },
    });

  } catch (error: any) {
    console.error('Error updating balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update balance' },
      { status: 500 }
    );
  }
}
