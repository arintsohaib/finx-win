

import { create } from 'zustand';
import { CryptoPrice, Trade } from '@/lib/types';

// Cache for enabled assets (refreshed every 5 minutes)
let cachedAssets: string[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Fallback symbols in case dynamic fetch fails
const FALLBACK_SYMBOLS = [
  // Crypto
  'BTC', 'ETH', 'USDT', 'DOGE', 'ADA', 'LTC', 'XRP', 'SOL', 'PI',
  // Forex
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
  // Precious Metals
  'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM',
  // Stocks (US & World)
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC',
  '7203', 'SIE', 'NESN', 'MC', 'SHEL', 'AZN', 'SAP', 'SONY', 'TTE', 'HSBA'
];

interface TradingState {
  prices: CryptoPrice[];
  selectedAsset: CryptoPrice | null;
  isLoadingPrices: boolean;
  priceError: string | null;
  trades: Trade[];
  activeTrades: Trade[];
  isLoadingTrades: boolean;
  isTradeModalOpen: boolean;
  lastPriceUpdate: number | null;
  autoRefreshInterval: NodeJS.Timeout | null;

  // Actions
  setPrices: (prices: CryptoPrice[]) => void;
  setSelectedAsset: (asset: CryptoPrice | null) => void;
  setLoadingPrices: (loading: boolean) => void;
  setPriceError: (error: string | null) => void;
  setTrades: (trades: Trade[]) => void;
  setActiveTrades: (trades: Trade[]) => void;
  setLoadingTrades: (loading: boolean) => void;
  setTradeModalOpen: (open: boolean) => void;
  fetchPrices: () => Promise<void>;
  fetchTrades: (status?: string) => Promise<void>;
  createTrade: (tradeData: any) => Promise<boolean>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

/**
 * Fetch enabled trading assets dynamically from database
 * Caches results for 5 minutes to minimize database queries
 */
async function fetchEnabledAssets(): Promise<string[]> {
  // Check if cache is still valid
  const now = Date.now();
  if (cachedAssets !== null && cacheTimestamp !== null && (now - cacheTimestamp < CACHE_DURATION_MS)) {
    console.log('📦 Using cached asset list:', cachedAssets.length, 'assets');
    return Array.from(cachedAssets); // Return a copy to prevent mutations
  }

  try {
    console.log('🔄 Fetching enabled assets from database...');
    const response = await fetch('/api/trading/enabled-assets', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.allSymbols && Array.isArray(data.data.allSymbols) && data.data.allSymbols.length > 0) {
        // Update cache
        const assets: string[] = data.data.allSymbols;
        cachedAssets = assets;
        cacheTimestamp = now;
        console.log(`✅ Dynamic assets loaded: ${assets.length} total`);
        return Array.from(assets); // Return a copy
      }
    }

    // If API fails, use fallback
    console.warn('⚠️ Failed to fetch dynamic assets, using fallback list');
    return Array.from(FALLBACK_SYMBOLS);
  } catch (error) {
    console.error('❌ Error fetching enabled assets:', error);
    // Use fallback on error
    return Array.from(FALLBACK_SYMBOLS);
  }
}

export const useTradingStore = create<TradingState>((set, get) => ({
  prices: [],
  selectedAsset: null,
  isLoadingPrices: false,
  priceError: null,
  trades: [],
  activeTrades: [],
  isLoadingTrades: false,
  isTradeModalOpen: false,
  lastPriceUpdate: null,
  autoRefreshInterval: null,

  setPrices: (prices) => set({ prices, lastPriceUpdate: Date.now(), priceError: null }),

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  setLoadingPrices: (loading) => set({ isLoadingPrices: loading }),

  setPriceError: (error) => set({ priceError: error }),

  setTrades: (trades) => set({ trades }),

  setActiveTrades: (trades) => set({ activeTrades: trades }),

  setLoadingTrades: (loading) => set({ isLoadingTrades: loading }),

  setTradeModalOpen: (open) => set({ isTradeModalOpen: open }),

  fetchPrices: async () => {
    const { setLoadingPrices, setPrices, setPriceError } = get();

    const MAX_RETRIES = 3;
    let retryCount = 0;

    const attemptFetch = async (): Promise<boolean> => {
      try {
        setLoadingPrices(true);

        // ✅ DYNAMIC: Fetch enabled assets from database
        const allSymbols = await fetchEnabledAssets();

        if (!allSymbols || allSymbols.length === 0) {
          throw new Error('No enabled assets found');
        }

        console.log(`📊 Fetching prices for ${allSymbols.length} assets:`, allSymbols.join(', '));

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

        // NO CACHE - Always fetch fresh data with timestamp to prevent browser caching
        const response = await fetch(`/api/prices?symbols=${allSymbols.join(',')}&t=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setPrices(data.data);
            setPriceError(null);
            console.log(`✅ LIVE Prices updated: ${data.data.length} assets at ${new Date().toLocaleTimeString()}`);
            return true;
          } else {
            throw new Error('No price data received');
          }
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (error: any) {
        console.error(`❌ Error fetching prices (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

        retryCount++;

        if (retryCount < MAX_RETRIES) {
          // Show retry message
          setPriceError(`Connection issue. Retrying (${retryCount}/${MAX_RETRIES})...`);

          // Wait before retry with exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Max 5 seconds
          await new Promise(resolve => setTimeout(resolve, backoffTime));

          // Retry
          return attemptFetch();
        } else {
          // All retries failed
          setPriceError('Unable to fetch live prices. Will retry automatically...');

          // Schedule automatic retry after 10 seconds
          setTimeout(() => {
            console.log('🔄 Automatic retry after failure...');
            retryCount = 0; // Reset retry count
            setPriceError('Reconnecting...');
            attemptFetch();
          }, 10000);

          return false;
        }
      } finally {
        setLoadingPrices(false);
      }
    };

    // Start the fetch attempt
    await attemptFetch();
  },

  fetchTrades: async (status?: string) => {
    const { setLoadingTrades, setTrades, setActiveTrades } = get();

    try {
      setLoadingTrades(true);

      const url = status ? `/api/trades?status=${status}` : '/api/trades';
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const trades = data.trades || [];

        if (status === 'active') {
          setActiveTrades(trades);
        } else if (!status) {
          setTrades(trades);
          // Also set active trades
          const active = trades.filter((t: Trade) => t.status === 'active');
          setActiveTrades(active);
        }
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoadingTrades(false);
    }
  },

  createTrade: async (tradeData) => {
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      if (response.ok) {
        // Refresh trades after successful creation
        get().fetchTrades();
        return true;
      } else {
        const error = await response.json();
        console.error('Trade creation error:', error);
        return false;
      }
    } catch (error) {
      console.error('Error creating trade:', error);
      return false;
    }
  },

  startAutoRefresh: () => {
    const { fetchPrices, stopAutoRefresh, autoRefreshInterval } = get();

    // Clear any existing interval first
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    // Start auto-refresh every 60 seconds (1 minute)
    console.log('🔄 Starting auto-refresh: Every 60 seconds');
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing prices...');
      fetchPrices();
    }, 60000); // 60 seconds = 1 minute

    set({ autoRefreshInterval: interval });

    // Initial fetch
    fetchPrices();
  },

  stopAutoRefresh: () => {
    const { autoRefreshInterval } = get();
    if (autoRefreshInterval) {
      console.log('🛑 Stopping auto-refresh');
      clearInterval(autoRefreshInterval);
      set({ autoRefreshInterval: null });
    }
  }
}));

