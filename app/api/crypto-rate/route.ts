export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCryptoRate } from '@/lib/crypto-rates';
import { coinMarketCapService } from '@/lib/coinmarketcap';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Support both 'currency' and 'symbol' parameters for flexibility
    const currency = searchParams.get('currency') || searchParams.get('symbol');

    if (!currency) {
      return NextResponse.json(
        { error: 'Currency or symbol parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[CRYPTO_RATE_API] Fetching rate for ${currency.toUpperCase()} to USDT`);

    // Get the crypto price in USD using CoinMarketCap
    const cryptoPrice = await coinMarketCapService.getPrice(currency);
    
    if (!cryptoPrice || !cryptoPrice.current_price) {
      console.error(`[CRYPTO_RATE_API] Price not found for ${currency}`);
      return NextResponse.json(
        { error: `Price not found for ${currency}` },
        { status: 404 }
      );
    }

    // Since CoinMarketCap returns USD prices, and USDT ≈ USD
    const rate = cryptoPrice.current_price;
    
    console.log(`[CRYPTO_RATE_API] ✅ Rate for ${currency.toUpperCase()}: ${rate} USDT`);

    // Return both 'rate' and 'price' for compatibility
    return NextResponse.json({ 
      rate,
      price: rate,
      symbol: currency.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRYPTO_RATE_API] Error fetching crypto rate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
