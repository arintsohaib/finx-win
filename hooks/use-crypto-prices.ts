
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CryptoPriceData {
  symbol: string;
  usdPrice: number;
  change24h: number;
  source: string;
  lastUpdated: string;
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<Record<string, CryptoPriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPrices = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      const url = forceRefresh 
        ? '/api/wallet/prices?refresh=true' 
        : '/api/wallet/prices';

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn('[Crypto Prices] API returned non-OK status:', response.status);
        // Keep existing prices if available, just set error
        setError('Price update failed');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.prices) {
        setPrices(data.prices);
        setLastUpdate(new Date());
        setError(null);
      } else {
        console.warn('[Crypto Prices] Invalid response data:', data);
        setError(data.error || 'Invalid price data');
      }
    } catch (err) {
      console.error('[Crypto Prices] Error fetching prices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      setError(errorMessage);
      // Keep existing prices, don't clear them
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prices on mount and every 60 seconds (1 minute)
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => fetchPrices(), 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getPrice = useCallback((symbol: string): number => {
    return prices[symbol]?.usdPrice || 0;
  }, [prices]);

  const getPriceChange = useCallback((symbol: string): number => {
    return prices[symbol]?.change24h || 0;
  }, [prices]);

  const getPriceSource = useCallback((symbol: string): string => {
    return prices[symbol]?.source || 'Unknown';
  }, [prices]);

  const convertToUSD = useCallback((amount: number, symbol: string): number => {
    const price = getPrice(symbol);
    return amount * price;
  }, [getPrice]);

  const convertFromUSD = useCallback((usdAmount: number, symbol: string): number => {
    const price = getPrice(symbol);
    return price > 0 ? usdAmount / price : 0;
  }, [getPrice]);

  return {
    prices,
    loading,
    error,
    lastUpdate,
    fetchPrices,
    getPrice,
    getPriceChange,
    getPriceSource,
    convertToUSD,
    convertFromUSD,
  };
}

