export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCryptoRates, getCryptoRate } from '@/lib/crypto-rates';
/**
 * GET /api/crypto/rates
 * Fetch live crypto rates for multiple currencies or a single currency
 * Query params:
 * - currencies: comma-separated list (e.g., "BTC,ETH,TRX")
 * - currency: single currency (e.g., "BTC")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currenciesParam = searchParams.get('currencies');
    const currencyParam = searchParams.get('currency');

    if (currencyParam) {
      // Single currency request
      const rate = await getCryptoRate(currencyParam.toUpperCase());
      return NextResponse.json({
        success: true,
        rate,
      });
    } else if (currenciesParam) {
      // Multiple currencies request
      const currencies = currenciesParam.split(',').map((c: any) => c.trim().toUpperCase());
      const rates = await getCryptoRates(currencies);
      return NextResponse.json({
        success: true,
        rates,
      });
    } else {
      return NextResponse.json(
        { error: 'Please provide either currency or currencies parameter' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Crypto rates API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto rates' },
      { status: 500 }
    );
  }
}
