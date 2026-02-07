export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAllPrices } from '@/lib/exchange-rate-verifier';
export const revalidate = 0; // Disable caching for real-time prices

/**
 * Get all current prices with multi-source verification
 */
export async function GET(request: NextRequest) {
  try {
    const prices = await getAllPrices();

    return NextResponse.json({
      success: true,
      data: prices,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      verified: true,
    });

  } catch (error) {
    console.error('[Conversions API] Error fetching prices:', error);
    
    // Return error - no fallback prices
    return NextResponse.json({
      success: false,
      error: 'Unable to fetch cryptocurrency prices from APIs. Please try again in a moment.',
      data: {},
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      verified: false,
    }, { status: 503 }); // Service Unavailable
  }
}
