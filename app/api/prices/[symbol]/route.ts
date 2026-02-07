export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { coinMarketCapService } from '@/lib/coinmarketcap';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params;
    
    // Get price from CoinMarketCap (with caching)
    const price = await coinMarketCapService.getPrice(symbol);
    const detailed = await coinMarketCapService.getDetailedPrice(symbol);
    
    if (!price && !detailed) {
      return NextResponse.json(
        { error: 'Symbol not found' },
        { status: 404 }
      );
    }

    const priceData = {
      ...detailed,
      current_price: price?.current_price || detailed?.current_price || 0,
      price_source: 'CoinMarketCap',
      price_timestamp: Date.now(),
      is_live: true,
      historical_prices: [] // CMC basic plan doesn't include historical data
    };

    return NextResponse.json({
      success: true,
      data: priceData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      }
    });

  } catch (error) {
    console.error('Error fetching price details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price details' },
      { status: 500 }
    );
  }
}
