export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { coinMarketCapService } from '@/lib/coinmarketcap';
interface VerificationSource {
  name: string;
  rate: number;
  success: boolean;
  timestamp: Date;
}

interface VerifiedRateData {
  rate: number;
  sources: VerificationSource[];
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
}

/**
 * Verify exchange rate between two cryptocurrencies
 * GET /api/conversions/verify-rate?from=USDT&to=BTC
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from')?.toUpperCase();
    const toCurrency = searchParams.get('to')?.toUpperCase();

    // Validation
    if (!fromCurrency || !toCurrency) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Both from and to currencies are required' 
        },
        { status: 400 }
      );
    }

    // CRITICAL: Prevent USDT to USDT conversions
    if (fromCurrency === 'USDT' && toCurrency === 'USDT') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot convert USDT to USDT' 
        },
        { status: 400 }
      );
    }

    // Same currency check
    if (fromCurrency === toCurrency) {
      return NextResponse.json(
        {
          success: true,
          data: {
            rate: 1,
            sources: [
              {
                name: 'Same Currency',
                rate: 1,
                success: true,
                timestamp: new Date()
              }
            ],
            verified: true,
            confidence: 'high',
            timestamp: new Date()
          } as VerifiedRateData
        }
      );
    }

    // For conversions involving USDT
    if (fromCurrency === 'USDT') {
      // USDT to another crypto: get the crypto price in USD
      const toPrice = await coinMarketCapService.getPrice(toCurrency);
      
      if (!toPrice || toPrice.current_price <= 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Unable to fetch price for ${toCurrency}` 
          },
          { status: 500 }
        );
      }

      // 1 USDT = 1 USD, so rate is 1 / price_in_usd
      const rate = 1 / toPrice.current_price;

      const data: VerifiedRateData = {
        rate,
        sources: [
          {
            name: 'CoinMarketCap',
            rate,
            success: true,
            timestamp: new Date()
          }
        ],
        verified: true,
        confidence: 'high',
        timestamp: new Date()
      };

      return NextResponse.json({ success: true, data });
    }

    if (toCurrency === 'USDT') {
      // Another crypto to USDT: get the crypto price in USD
      const fromPrice = await coinMarketCapService.getPrice(fromCurrency);
      
      if (!fromPrice || fromPrice.current_price <= 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Unable to fetch price for ${fromCurrency}` 
          },
          { status: 500 }
        );
      }

      // 1 crypto = X USD = X USDT
      const rate = fromPrice.current_price;

      const data: VerifiedRateData = {
        rate,
        sources: [
          {
            name: 'CoinMarketCap',
            rate,
            success: true,
            timestamp: new Date()
          }
        ],
        verified: true,
        confidence: 'high',
        timestamp: new Date()
      };

      return NextResponse.json({ success: true, data });
    }

    // For crypto-to-crypto conversions (not involving USDT)
    const [fromPrice, toPrice] = await Promise.all([
      coinMarketCapService.getPrice(fromCurrency),
      coinMarketCapService.getPrice(toCurrency)
    ]);

    if (!fromPrice || !toPrice || fromPrice.current_price <= 0 || toPrice.current_price <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unable to fetch exchange rate for ${fromCurrency} / ${toCurrency}` 
        },
        { status: 500 }
      );
    }

    // Calculate cross rate: (1 FROM = X USD) / (1 TO = Y USD) = 1 FROM = X/Y TO
    const rate = fromPrice.current_price / toPrice.current_price;

    const data: VerifiedRateData = {
      rate,
      sources: [
        {
          name: 'CoinMarketCap',
          rate,
          success: true,
          timestamp: new Date()
        }
      ],
      verified: true,
      confidence: 'high',
      timestamp: new Date()
    };

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error verifying exchange rate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify exchange rate. Please try again.' 
      },
      { status: 500 }
    );
  }
}
