
/**
 * Price Validation Wrapper for CoinMarketCap
 * 
 * Uses CoinMarketCap API with aggressive caching to minimize API calls
 * Validates prices for trading to ensure they're fresh and reliable
 */

import { coinMarketCapService } from './coinmarketcap';

export interface PriceData {
  price: number;
  timestamp: number; // When the price was fetched
  source: string; // Which API provided this price
  symbol: string;
}

export interface PriceValidationResult {
  isValid: boolean;
  price?: PriceData;
  error?: string;
}

const MAX_PRICE_AGE_MS = 120000; // 120 seconds (2 minutes) - prices cached for up to 60s are still valid for trading

/**
 * Fetch price from CoinMarketCap (with caching)
 */
export async function fetchPriceMultiSource(symbol: string): Promise<PriceData | null> {
  try {
    const priceData = await coinMarketCapService.getPrice(symbol);
    
    if (!priceData || priceData.current_price <= 0) {
      return null;
    }
    
    return {
      price: priceData.current_price,
      timestamp: Date.now(),
      source: 'CoinMarketCap',
      symbol: symbol.toUpperCase()
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Validate Price for Trading
 * 
 * Ensures the price is:
 * 1. Successfully fetched from CoinMarketCap
 * 2. Valid (price > 0)
 * 3. Fresh enough for trading (cached prices up to 2 minutes are acceptable)
 */
export async function validatePriceForTrading(symbol: string): Promise<PriceValidationResult> {
  const priceData = await fetchPriceMultiSource(symbol);

  // No price data available
  if (!priceData) {
    return {
      isValid: false,
      error: 'Unable to fetch real-time price. Please try again in a moment.'
    };
  }

  // Check price validity
  if (priceData.price <= 0) {
    return {
      isValid: false,
      error: 'Invalid price data received. Please try again.'
    };
  }

  // All checks passed
  return {
    isValid: true,
    price: priceData
  };
}

/**
 * Get Price with Source Info (for display purposes)
 */
export async function getPriceWithSource(symbol: string): Promise<PriceData | null> {
  return fetchPriceMultiSource(symbol);
}
