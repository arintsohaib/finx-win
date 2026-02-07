export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { coinMarketCapService } from '@/lib/coinmarketcap';
// GET - Get all balances for user with USD values
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch all balances for user
    const balances = await prisma.balance.findMany({
      where: { walletAddress: payload.walletAddress },
    });

    console.log(`[WALLET BALANCE] User ${payload.walletAddress} - Found ${balances.length} balance records`);
    balances.forEach((b: any) => {
      console.log(`  ${b.currency}: realBalance=${b.realBalance}, amount=${b.amount}`);
    });

    // Fetch current prices from CoinMarketCap
    let pricesData: any = { success: false, prices: {} };
    try {
      console.log('[WALLET BALANCE] 🔄 Fetching crypto prices from CoinMarketCap...');
      const symbols = Object.keys(SUPPORTED_CRYPTOS);
      const fetchedPrices = await coinMarketCapService.getPrices(symbols);

      // Transform to our API format
      const prices: Record<string, any> = {};
      for (const priceData of fetchedPrices) {
        if (priceData && priceData.current_price > 0) {
          prices[priceData.symbol] = {
            symbol: priceData.symbol,
            usdPrice: priceData.current_price,
            change24h: priceData.price_change_percentage_24h || 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      pricesData = { success: true, prices };

      console.log('[WALLET BALANCE] === PRICES FETCHED FROM COINMARKETCAP ===');
      console.log('[WALLET BALANCE] Success:', pricesData.success);
      console.log('[WALLET BALANCE] Prices received:', Object.keys(pricesData.prices || {}).length, 'symbols');

      // Log individual prices for debugging
      Object.entries(pricesData.prices).forEach(([symbol, priceData]: [string, any]) => {
        console.log(`[WALLET BALANCE] Price for ${symbol}: $${priceData?.usdPrice || 0}`);
      });
    } catch (priceError) {
      console.error('[WALLET BALANCE] ❌ Failed to fetch prices from CoinMarketCap:', priceError);
      console.log('[WALLET BALANCE] Continuing with zero prices...');
    }

    // Create balance map with USD values
    const balanceMap: Record<string, any> = {};

    for (const [symbol, config] of Object.entries(SUPPORTED_CRYPTOS)) {
      const balance = balances.find((b: any) => b.currency === symbol);
      let price = pricesData.prices?.[symbol]?.usdPrice || 0;

      // CRITICAL: Always fallback to 1.0 for USDT if price is missing/zero
      // This ensures USDT balance is always counted in Total Portfolio Value
      if (symbol === 'USDT' && (price === 0 || !price)) {
        price = 1.0;
      }


      // CRITICAL: Use balance.amount (available balance) as the primary balance
      // This ensures consistency with Trading page and getUserBalances()
      const availableAmount = balance ? parseFloat(balance.amount.toString()) : 0;
      const realBalance = balance ? parseFloat(balance.realBalance.toString()) : 0;
      const realWinnings = balance ? parseFloat(balance.realWinnings.toString()) : 0;
      const frozenBalance = balance ? parseFloat(balance.frozenBalance.toString()) : 0;

      const usdValue = availableAmount * price;

      balanceMap[symbol] = {
        currency: symbol,
        name: config.name,
        icon: config.icon,
        color: config.color,
        amount: availableAmount, // PRIMARY: Total available balance (same as Trading page)
        realBalance, // Deposited amount (for reference)
        realWinnings, // Winnings from trades (for reference)
        frozenBalance, // Locked in withdrawals (for reference)
        availableForTrading: availableAmount - frozenBalance, // Amount user can actually trade
        usdValue, // USD value based on available balance
        currentPrice: price,
        priceChange24h: pricesData.prices?.[symbol]?.change24h || 0,
      };

      if (availableAmount > 0) {
        console.log(`  [BALANCE MAP] ${symbol}: amount=${availableAmount}, price=$${price}, usdValue=$${usdValue.toFixed(2)}`);
      }
    }

    // Calculate total portfolio value (sum of all asset values)
    const totalPortfolioValueRaw = Object.entries(balanceMap).reduce(
      (sum: number, [currency, bal]: [string, any]) => {
        const newSum = sum + bal.usdValue;
        return newSum;
      },
      0
    );

    // Note: Active trades are EXCLUDED from Portfolio Value (Net Liquidity Model)
    // This allows the value to drop ("live cut") when a trade is placed, matching the USDT balance.

    // ✅ Round to 2 decimals AFTER summation for final display value
    const totalPortfolioValue = Math.round(totalPortfolioValueRaw * 100) / 100;

    console.log('[WALLET BALANCE] === PORTFOLIO CALCULATION COMPLETE ===');
    console.log(`[WALLET BALANCE] Raw total: $${totalPortfolioValueRaw.toFixed(6)}`);
    console.log(`[WALLET BALANCE] Rounded total: $${totalPortfolioValue.toFixed(2)}`);

    // Get USDT balance specifically (for trading)
    const usdtBalance = balanceMap['USDT'];

    console.log(`[WALLET BALANCE] Portfolio Summary:`);
    console.log(`  Total Portfolio Value (ALL crypto): $${totalPortfolioValue.toFixed(2)}`);
    console.log(`  USDT Balance: ${usdtBalance?.amount || 0} USDT`);

    return NextResponse.json({
      success: true,
      balances: balanceMap,
      totalPortfolioValue, // ALL crypto including USDT
      tradingBalance: usdtBalance,
    });

  } catch (error) {
    console.error('Fetch balances error:', error);
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 });
  }
}
