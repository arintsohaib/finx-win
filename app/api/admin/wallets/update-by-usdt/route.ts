export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { coinMarketCapService } from '@/lib/coinmarketcap';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
/**
 * USDT-Based Balance Update API
 * 
 * This endpoint allows Super Admins to update user wallet balances by editing the USDT value directly.
 * The system automatically calculates the crypto amount using live CoinMarketCap rates.
 * 
 * Flow:
 * 1. Admin enters desired USDT value
 * 2. System fetches live CMC rate for the crypto
 * 3. Calculates: crypto_amount = usdt_value / rate
 * 4. Updates database with new crypto balance
 * 5. Logs action in ActivityLog
 * 6. Emits real-time socket event for instant sync
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authentication
    const admin = await verifyAdminAuth(req);
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    // 2. Check permission (only Super Admin can edit balances)
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can edit balances by USDT value' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const { walletAddress, uid, currency, usdtValue, oldUsdtValue } = body;

    // 4. Validate inputs
    if (!walletAddress || !currency || usdtValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, currency, usdtValue' },
        { status: 400 }
      );
    }

    const usdtValueNum = parseFloat(usdtValue);
    const oldUsdtValueNum = parseFloat(oldUsdtValue || 0);

    // Validation: Minimum allowed edit value: 0.00000001
    if (usdtValueNum < 0) {
      return NextResponse.json(
        { error: 'USDT value cannot be negative' },
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
    let conversionRate: number;
    
    if (currency === 'USDT') {
      // USDT is always 1:1
      conversionRate = 1.0;
    } else {
      const priceData = await coinMarketCapService.getPrice(currency);
      if (!priceData || !priceData.current_price) {
        return NextResponse.json(
          { error: `Unable to fetch live conversion rate for ${currency}. Please try again.` },
          { status: 500 }
        );
      }
      conversionRate = priceData.current_price;
    }

    // Validate conversion rate
    if (conversionRate <= 0) {
      return NextResponse.json(
        { error: `Invalid conversion rate for ${currency}` },
        { status: 500 }
      );
    }

    // 7. Calculate new crypto balance: crypto_amount = usdt_value / rate
    const newCryptoBalance = usdtValueNum / conversionRate;

    // Auto round to 8 decimals
    const roundedCryptoBalance = parseFloat(newCryptoBalance.toFixed(8));

    // 8. Fetch old balance for comparison
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

    const oldCryptoBalance = parseFloat(balance.amount.toString());
    const currentRealBalance = parseFloat(balance.realBalance.toString());

    // 9. Determine action type (add/remove) based on difference
    const cryptoDifference = roundedCryptoBalance - oldCryptoBalance;
    const usdtDifference = usdtValueNum - oldUsdtValueNum;
    const actionType = cryptoDifference > 0 ? 'ADD' : cryptoDifference < 0 ? 'REMOVE' : 'NONE';
    const changeCryptoAmount = Math.abs(cryptoDifference);
    const changeUsdtAmount = Math.abs(usdtDifference);

    if (actionType === 'NONE') {
      return NextResponse.json(
        { success: true, message: 'No changes detected', data: { actionType: 'NONE' } },
        { status: 200 }
      );
    }

    // 10. Update balance in database (transaction for atomicity)
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
          amount: roundedCryptoBalance,
          // Update realBalance based on action type
          realBalance: actionType === 'ADD'
            ? { increment: changeCryptoAmount }
            : { decrement: Math.min(changeCryptoAmount, currentRealBalance) },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          walletAddress,
          uid: user.uid,
          activityType: 'ADMIN_BALANCE_ADJUSTMENT',
          activityCategory: actionType === 'ADD' ? 'BALANCE_ADD_BY_USDT' : 'BALANCE_REMOVE_BY_USDT',
          cryptoType: currency,
          amount: changeCryptoAmount,
          amountUsd: changeUsdtAmount,
          status: 'completed',
          metadata: JSON.stringify({
            currency,
            method: 'USDT_EDIT',
            changeCryptoAmount,
            changeUsdtAmount,
            conversionRate,
            previousCryptoBalance: oldCryptoBalance,
            newCryptoBalance: roundedCryptoBalance,
            previousUsdtValue: oldUsdtValueNum,
            newUsdtValue: usdtValueNum,
            actionType,
            adminId: admin.id,
            adminUsername: admin.username,
            note: `Balance edited via USDT value. ${actionType === 'ADD' ? 'Added' : 'Removed'} ${changeCryptoAmount.toFixed(8)} ${currency} (≈ $${changeUsdtAmount.toFixed(2)}) @ ${conversionRate.toFixed(2)} USDT/${currency}`,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return updated;
    });

    // 11. Calculate total portfolio value in USDT
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

    // 12. Emit real-time event for instant sync
    realtimeEvents.emit(REALTIME_EVENTS.USER_BALANCE_UPDATED, {
      walletAddress,
      currency,
      newBalance: roundedCryptoBalance,
      usdtValue: usdtValueNum,
      totalPortfolioUsdt,
      action: actionType,
      changeCryptoAmount,
      changeUsdtAmount,
      conversionRate,
      updateMethod: 'USDT_EDIT',
    });

    // 13. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${currency} balance to ${roundedCryptoBalance.toFixed(8)} (≈ $${usdtValueNum.toFixed(2)}) @ ${conversionRate.toFixed(2)} USDT/${currency}`,
      data: {
        walletAddress,
        currency,
        actionType,
        conversionRate,
        // Crypto values
        previousCryptoBalance: oldCryptoBalance,
        newCryptoBalance: roundedCryptoBalance,
        changeCryptoAmount,
        // USDT values
        previousUsdtValue: oldUsdtValueNum,
        newUsdtValue: usdtValueNum,
        changeUsdtAmount,
        // Portfolio
        totalPortfolioUsdt,
        updatedAt: updatedBalance.updatedAt,
      },
    });

  } catch (error: any) {
    console.error('Error updating balance by USDT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update balance by USDT value' },
      { status: 500 }
    );
  }
}
