

/**
 * Multi-Source Exchange Rate Verifier
 * Fetches and cross-verifies rates from multiple reliable APIs
 */

export interface ExchangeRateSource {
  name: string;
  rate: number;
  timestamp: Date;
  success: boolean;
}

export interface VerifiedRate {
  rate: number;
  sources: ExchangeRateSource[];
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
  fromCurrency: string;
  toCurrency: string;
}

interface CachedRate {
  rate: VerifiedRate;
  cachedAt: Date;
}

// In-memory cache for rates (1 hour expiry)
const rateCache = new Map<string, CachedRate>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Map our currency codes to API-specific identifiers
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  LTC: 'litecoin',
  XRP: 'ripple',
  SOL: 'solana',
  PI: 'pi-network',
};

const BINANCE_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  USDT: 'USDTUSDT',
  DOGE: 'DOGEUSDT',
  ADA: 'ADAUSDT',
  LTC: 'LTCUSDT',
  XRP: 'XRPUSDT',
  SOL: 'SOLUSDT',
};

/**
 * Fetch rate from CoinGecko API
 */
async function fetchCoinGeckoRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateSource> {
  try {
    const fromId = COINGECKO_IDS[fromCurrency];
    const toId = COINGECKO_IDS[toCurrency];
    
    if (!fromId || !toId) {
      throw new Error('Currency not supported');
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${fromId},${toId}&vs_currencies=usd`,
      { 
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) throw new Error('CoinGecko API error');

    const data = await response.json();
    const fromPrice = data[fromId]?.usd;
    const toPrice = data[toId]?.usd;

    if (!fromPrice || !toPrice) {
      throw new Error('Price data unavailable');
    }

    return {
      name: 'CoinGecko',
      rate: fromPrice / toPrice,
      timestamp: new Date(),
      success: true,
    };
  } catch (error) {
    console.error('CoinGecko fetch error:', error);
    return {
      name: 'CoinGecko',
      rate: 0,
      timestamp: new Date(),
      success: false,
    };
  }
}

/**
 * Fetch rate from Binance Public API
 */
async function fetchBinanceRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateSource> {
  try {
    // For direct pairs
    const directPair = `${fromCurrency}${toCurrency}`;
    
    // Try direct pair first
    let response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${directPair}`,
      { 
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      }
    );

    let rate: number;

    if (response.ok) {
      const data = await response.json();
      rate = parseFloat(data.price);
    } else {
      // If direct pair fails, use USDT as intermediate
      const fromPair = BINANCE_PAIRS[fromCurrency];
      const toPair = BINANCE_PAIRS[toCurrency];

      if (!fromPair || !toPair) {
        throw new Error('Currency not supported');
      }

      const [fromResponse, toResponse] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${fromPair}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        }),
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${toPair}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })
      ]);

      if (!fromResponse.ok || !toResponse.ok) {
        throw new Error('Binance API error');
      }

      const fromData = await fromResponse.json();
      const toData = await toResponse.json();

      const fromPrice = parseFloat(fromData.price);
      const toPrice = parseFloat(toData.price);

      if (toCurrency === 'USDT') {
        rate = fromPrice;
      } else if (fromCurrency === 'USDT') {
        rate = 1 / toPrice;
      } else {
        rate = fromPrice / toPrice;
      }
    }

    return {
      name: 'Binance',
      rate,
      timestamp: new Date(),
      success: true,
    };
  } catch (error) {
    console.error('Binance fetch error:', error);
    return {
      name: 'Binance',
      rate: 0,
      timestamp: new Date(),
      success: false,
    };
  }
}

/**
 * Fetch rate from CryptoCompare API
 */
async function fetchCryptoCompareRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateSource> {
  try {
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/price?fsym=${fromCurrency}&tsyms=${toCurrency}`,
      { 
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) throw new Error('CryptoCompare API error');

    const data = await response.json();
    const rate = data[toCurrency];

    if (!rate) {
      throw new Error('Rate not available');
    }

    return {
      name: 'CryptoCompare',
      rate,
      timestamp: new Date(),
      success: true,
    };
  } catch (error) {
    console.error('CryptoCompare fetch error:', error);
    return {
      name: 'CryptoCompare',
      rate: 0,
      timestamp: new Date(),
      success: false,
    };
  }
}

/**
 * Calculate confidence level based on rate variance
 */
function calculateConfidence(rates: number[]): 'high' | 'medium' | 'low' {
  if (rates.length < 2) return 'low';

  const mean = rates.reduce((a: any, b: any) => a + b, 0) / rates.length;
  const variance = rates.reduce((sum: any, rate: any) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;

  // High confidence if variation is less than 0.5%
  if (coefficientOfVariation < 0.5) return 'high';
  // Medium confidence if variation is less than 2%
  if (coefficientOfVariation < 2) return 'medium';
  // Low confidence otherwise
  return 'low';
}

/**
 * Verify exchange rate from multiple sources
 */
export async function verifyExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<VerifiedRate> {
  // Check cache first
  const cacheKey = `${fromCurrency}-${toCurrency}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_DURATION) {
    console.log('Returning cached rate');
    return cached.rate;
  }

  // Fetch from all sources in parallel
  const [coinGecko, binance, cryptoCompare] = await Promise.all([
    fetchCoinGeckoRate(fromCurrency, toCurrency),
    fetchBinanceRate(fromCurrency, toCurrency),
    fetchCryptoCompareRate(fromCurrency, toCurrency),
  ]);

  const sources = [coinGecko, binance, cryptoCompare];
  const successfulSources = sources.filter((s: any) => s.success);
  const rates = successfulSources.map((s: any) => s.rate);

  // Need at least 2 successful sources for verification
  if (successfulSources.length < 2) {
    // NO FALLBACK TO EXPIRED CACHE - Throw error for proper handling
    throw new Error('Insufficient live data sources available to verify exchange rates. Please try again later.');
  }

  // Calculate median rate (more robust than average)
  const sortedRates = [...rates].sort((a, b) => a - b);
  const median = sortedRates.length % 2 === 0
    ? (sortedRates[sortedRates.length / 2 - 1] + sortedRates[sortedRates.length / 2]) / 2
    : sortedRates[Math.floor(sortedRates.length / 2)];

  const confidence = calculateConfidence(rates);
  const verified = successfulSources.length >= 2 && confidence !== 'low';

  const verifiedRate: VerifiedRate = {
    rate: median,
    sources,
    verified,
    confidence,
    timestamp: new Date(),
    fromCurrency,
    toCurrency,
  };

  // Cache the result
  rateCache.set(cacheKey, {
    rate: verifiedRate,
    cachedAt: new Date(),
  });

  return verifiedRate;
}

/**
 * Get all current prices for supported currencies (in USD)
 */
export async function getAllPrices(): Promise<Record<string, number>> {
  const currencies = ['BTC', 'ETH', 'USDT', 'DOGE', 'ADA', 'LTC', 'XRP', 'SOL'];
  const prices: Record<string, number> = {};

  // Fetch all prices in parallel
  const pricePromises = currencies.map(async (currency) => {
    try {
      const verified = await verifyExchangeRate(currency, 'USDT');
      return { currency, price: verified.rate };
    } catch (error) {
      console.error(`Failed to fetch price for ${currency}:`, error);
      return { currency, price: 0 };
    }
  });

  const results = await Promise.all(pricePromises);
  
  results.forEach(({ currency, price }) => {
    prices[currency] = price;
  });

  // USDT is always 1
  prices.USDT = 1;
  // PI is not on major exchanges yet, use mock price
  prices.PI = 0.5;

  return prices;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of rateCache.entries()) {
    if (now - value.cachedAt.getTime() > CACHE_DURATION) {
      rateCache.delete(key);
    }
  }
}
