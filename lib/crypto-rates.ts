
/**
 * Cryptocurrency exchange rate fetching utilities
 * Supports cross-currency conversion using live rates
 * Uses CoinMarketCap API exclusively for all price data
 */

import { coinMarketCapService } from './coinmarketcap';

const CACHE_DURATION = 60000; // 1 minute

interface RateCache {
  rate: number;
  timestamp: number;
}

const rateCache = new Map<string, RateCache>();

/**
 * Get cryptocurrency exchange rate using CoinMarketCap
 * @param fromCurrency Source currency
 * @param toCurrency Target currency (defaults to USDT)
 * @returns Exchange rate (1 fromCurrency = X toCurrency)
 */
export async function getCryptoRate(
  fromCurrency: string,
  toCurrency: string = 'USDT'
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  console.log(`[CRYPTO_RATE] Fetching rate for ${from}/${to} from CoinMarketCap`);
  
  // Same currency
  if (from === to) {
    console.log(`[CRYPTO_RATE] Same currency, returning 1.0`);
    return 1;
  }
  
  // Check cache
  const cacheKey = `${from}-${to}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const age = Math.floor((Date.now() - cached.timestamp) / 1000);
    console.log(`[CRYPTO_RATE] ✅ Cache hit for ${cacheKey}: ${cached.rate} (age: ${age}s)`);
    return cached.rate;
  }
  
  console.log(`[CRYPTO_RATE] Cache miss for ${cacheKey}, fetching from CoinMarketCap...`);
  
  try {
    // Fetch prices from CoinMarketCap
    const [fromPrice, toPrice] = await Promise.all([
      coinMarketCapService.getPrice(from),
      coinMarketCapService.getPrice(to)
    ]);
    
    if (!fromPrice || !toPrice) {
      const unsupported = !fromPrice ? from : to;
      console.error(`[CRYPTO_RATE] ❌ Unsupported currency: ${unsupported}`);
      throw new Error(`Currency not found: ${unsupported}. Please check the symbol or contact support.`);
    }
    
    const fromPriceUsd = fromPrice.current_price;
    const toPriceUsd = toPrice.current_price;
    
    console.log(`[CRYPTO_RATE] ${from} price in USD: ${fromPriceUsd}`);
    console.log(`[CRYPTO_RATE] ${to} price in USD: ${toPriceUsd}`);
    
    if (!fromPriceUsd || !toPriceUsd || fromPriceUsd <= 0 || toPriceUsd <= 0) {
      console.error(`[CRYPTO_RATE] ❌ Invalid price data received`);
      throw new Error('Invalid rate data received');
    }
    
    // Calculate cross rate
    const rate = fromPriceUsd / toPriceUsd;
    console.log(`[CRYPTO_RATE] ✅ Calculated rate: 1 ${from} = ${rate} ${to}`);
    
    // ✅ VALIDATION: Ensure rate is positive and finite
    if (rate <= 0 || !isFinite(rate)) {
      console.error(`[CRYPTO_RATE] ❌ Invalid rate calculated: ${rate}`);
      throw new Error(`Invalid rate calculated: ${rate}`);
    }
    
    // Cache the rate
    rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
    console.log(`[CRYPTO_RATE] Rate cached for ${cacheKey}`);
    
    return rate;
  } catch (error) {
    console.error(`[CRYPTO_RATE] ❌ Error fetching ${from}/${to} rate:`, error);
    
    // No fallback rates - throw error so caller can handle it
    throw new Error(`Unable to fetch exchange rate for ${from}/${to}. Please try again.`);
  }
}

/**
 * Convert crypto amount to USDT
 */
export async function cryptoToUsdt(
  amount: number,
  currency: string
): Promise<number> {
  const rate = await getCryptoRate(currency, 'USDT');
  return amount * rate;
}

/**
 * Convert USDT to crypto amount
 */
export async function usdtToCrypto(
  usdtAmount: number,
  currency: string
): Promise<number> {
  const rate = await getCryptoRate(currency, 'USDT');
  return usdtAmount / rate;
}

/**
 * Clear rate cache (useful for testing or manual refresh)
 */
export function clearRateCache() {
  rateCache.clear();
  console.log('[CRYPTO_RATE] Rate cache cleared');
}

/**
 * Get multiple crypto rates at once
 */
export async function getCryptoRates(currencies: string[]): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  
  await Promise.all(
    currencies.map(async (currency) => {
      try {
        rates[currency] = await getCryptoRate(currency, 'USDT');
      } catch (error) {
        console.error(`Error fetching rate for ${currency}:`, error);
        rates[currency] = 0;
      }
    })
  );
  
  return rates;
}
