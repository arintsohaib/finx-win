export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { coinMarketCapService } from '@/lib/coinmarketcap';
export const revalidate = 60; // Cache for 60 seconds to reduce API calls

// Add timeout wrapper
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const symbols = url.searchParams.get('symbols')?.split(',') || [];
    
    console.log('📊 Fetching prices from CoinMarketCap (cached):', symbols.length > 0 ? symbols : 'all assets');
    
    // Add 30-second timeout to prevent hanging requests
    const prices = await withTimeout(
      coinMarketCapService.getPrices(symbols.length > 0 ? symbols : undefined),
      30000
    );
    
    if (!prices || prices.length === 0) {
      console.warn('⚠️ No prices returned from service');
      return NextResponse.json({
        success: false,
        error: 'No price data available',
        data: []
      }, { status: 503 });
    }
    
    console.log(`✅ Successfully fetched ${prices.length} prices from CoinMarketCap`);
    
    // Get API usage stats
    const stats = coinMarketCapService.getUsageStats();
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 API Usage:', stats);
    }
    
    return NextResponse.json({
      success: true,
      data: prices,
      timestamp: Date.now(),
      apiUsage: process.env.NODE_ENV === 'development' ? stats : undefined
    }, {
      headers: {
        // Cache for 60 seconds to reduce API calls
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching prices:', error);
    
    // Return a proper error response with details
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch prices',
      data: [] // Return empty array so frontend can use cached data
    }, { 
      status: 503, // Service temporarily unavailable
      headers: {
        'Cache-Control': 'public, max-age=60, stale-if-error=300',
      }
    });
  }
}

