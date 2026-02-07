export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { coinMarketCapService } from '@/lib/coinmarketcap';
export const revalidate = 0;

/**
 * Get Crypto Prices from CoinMarketCap
 * 
 * This endpoint uses CoinMarketCap API with 60-second caching built-in.
 * The CoinMarketCap service handles all caching, rate limiting, and fallbacks automatically.
 */
export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    
    // If forcing refresh, clear the cache first
    if (forceRefresh) {
      console.log('[Prices API] 🔄 Force refresh requested, clearing cache...');
      coinMarketCapService.clearCache();
    }

    console.log('[Prices API] 🚀 Fetching prices from CoinMarketCap...');
    
    // Fetch all prices (service handles caching internally)
    const cryptoPrices = await coinMarketCapService.getPrices();

    // Transform to wallet format
    const prices: Record<string, any> = {};
    
    for (const crypto of cryptoPrices) {
      prices[crypto.symbol] = {
        symbol: crypto.symbol,
        usdPrice: crypto.current_price,
        change24h: crypto.price_change_percentage_24h || 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const successCount = Object.keys(prices).length;
    console.log(`[Prices API] ✅ Successfully fetched ${successCount} prices`);

    return NextResponse.json({
      success: true,
      prices,
      cached: false,
      successRate: 100,
      lastUpdate: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Prices API] ❌ Error fetching crypto prices:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to fetch cryptocurrency prices. Please try again in a moment.',
        prices: {},
      },
      { status: 503 } // Service Unavailable
    );
  }
}

