'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoCard } from '@/components/crypto/crypto-card';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { Wallet, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';



const marketCategories = [
  { id: 'crypto', label: 'Crypto', active: true },
  { id: 'stocks', label: 'Stocks', active: true },
  { id: 'forex', label: 'Forex', active: true },
  { id: 'precious', label: 'Metals', active: true },
  { id: 'top', label: 'Top', active: true }
];

// Forex, Precious Metals, and Stocks symbols to fetch
const forexSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'];
const metalSymbols = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'];
const stockSymbols = [
  // US
  'NVDA', 'GOOGL', 'AAPL', 'MSFT', 'AMZN', 'META', 'AVGO', 'TSLA', 'BRK.B', 'LLY',
  // World
  'TSM', '2222.SR', '0700.HK', '005930.KS', 'ASML', 'BABA', '000660.KS', 'ROG.SW', '1398.HK', 'MC.PA'
];

export function Dashboard() {
  const {
    prices,
    isLoadingPrices,
    priceError,
    lastPriceUpdate,
    fetchPrices
  } = useTradingStore();

  const { user, refreshBalances, isInitializing } = useAuthStore();
  const { subscribe } = useRealtimeUser();
  const [activeCategory, setActiveCategory] = useState('crypto');
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // Fetch portfolio value (all crypto except USDT)
  const fetchPortfolioValue = async () => {
    if (!user?.walletAddress) return;

    try {
      setIsLoadingPortfolio(true);
      const response = await fetch('/api/wallet/balances');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.totalPortfolioValue !== undefined) {
          setPortfolioValue(data.totalPortfolioValue);
          console.log('✅ Portfolio value updated:', data.totalPortfolioValue);
        } else {
          console.warn('⚠️ Portfolio value response missing totalPortfolioValue');
        }
      } else {
        console.error('❌ Failed to fetch portfolio value, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch portfolio value:', error);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Fetch data when user is available and initialization is complete
  useEffect(() => {
    // Wait for session initialization to complete
    if (isInitializing) {
      console.log('⏳ Session initializing, waiting...');
      return;
    }

    // Wait for user data to be available
    if (!user?.walletAddress) {
      console.log('ℹ️ No user data available yet');
      return;
    }

    console.log('✅ User data available, fetching initial data...');
    // Initial fetch
    fetchPrices();
    refreshBalances();
    fetchPortfolioValue();

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing prices and portfolio...');
      fetchPrices();
      fetchPortfolioValue();
    }, 60000); // 60 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, user?.walletAddress]);

  // Listen for real-time balance updates
  useEffect(() => {
    if (!user?.walletAddress) return;

    console.log('🔄 Setting up real-time balance listeners...');

    // Subscribe to balance update events
    const unsubscribeBalance = subscribe('balance:updated', (data) => {
      console.log('💰 Balance update received, refreshing portfolio...');
      refreshBalances();
      fetchPortfolioValue();
    });

    // Subscribe to trade events
    const unsubscribeTrade = subscribe('trade:created', (data) => {
      console.log('📊 Trade created received, refreshing portfolio...');
      refreshBalances();
      fetchPortfolioValue();
    });

    const unsubscribeTradeSettled = subscribe('trade:settled', (data) => {
      console.log('✅ Trade settled received, refreshing portfolio...');
      refreshBalances();
      fetchPortfolioValue();
    });

    // Subscribe to deposit/withdrawal events
    const unsubscribeDeposit = subscribe('deposit:updated', (data) => {
      console.log('💵 Deposit update, refreshing portfolio...');
      refreshBalances();
      fetchPortfolioValue();
    });

    const unsubscribeWithdrawal = subscribe('withdrawal:updated', (data) => {
      console.log('💸 Withdrawal update, refreshing portfolio...');
      refreshBalances();
      fetchPortfolioValue();
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeBalance();
      unsubscribeTrade();
      unsubscribeTradeSettled();
      unsubscribeDeposit();
      unsubscribeWithdrawal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.walletAddress]);

  const usdtBalance = user?.balances?.USDT || '0';

  // Get forex and metals data from prices - SORTED BY PRICE (HIGHEST TO LOWEST)
  const forexPrices = (prices || [])
    .filter((p: any) => p && p.symbol && forexSymbols.includes(p.symbol))
    .sort((a, b) => (b.current_price || 0) - (a.current_price || 0));

  const metalPrices = (prices || [])
    .filter((p: any) => p && p.symbol && metalSymbols.includes(p.symbol))
    .sort((a, b) => (b.current_price || 0) - (a.current_price || 0));

  // Get stock prices - SORTED BY PRICE (HIGHEST TO LOWEST)
  const stockPrices = (prices || [])
    .filter((p: any) => p && p.symbol && stockSymbols.includes(p.symbol))
    .sort((a, b) => (b.current_price || 0) - (a.current_price || 0));

  // Get ONLY crypto prices (exclude forex, metals, and stocks) - SORTED BY PRICE (HIGHEST TO LOWEST)
  const cryptoPrices = (prices || [])
    .filter((p: any) => p && p.symbol && !forexSymbols.includes(p.symbol) && !metalSymbols.includes(p.symbol) && !stockSymbols.includes(p.symbol))
    .sort((a, b) => (b.current_price || 0) - (a.current_price || 0));

  return (
    <>
      <div className="min-h-screen gradient-subtle">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Portfolio Card - Modernized for 2026 */}
          {/* ... rest of the content ... */}
          <Card className="mb-6 glass-card overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-70">Portfolio Net Worth</p>
                    {((isInitializing || isLoadingPortfolio) && portfolioValue === null) ? (
                      <div className="flex items-center gap-3 mt-2 h-[48px]">
                        <div className="animate-pulse w-32 h-8 bg-primary/20 rounded-lg"></div>
                      </div>
                    ) : (
                      <div className="mt-1 h-[48px]">
                        <p className="text-4xl font-extrabold tracking-tight gradient-text">
                          ${(portfolioValue || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60 uppercase">USDT EQUIVALENT</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 glass-morphism rounded-2xl shadow-inner">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Available Balance</p>
                    <p className="text-sm font-bold mt-0.5">${parseFloat(user?.balances?.USDT || '0').toLocaleString()}</p>
                  </div>
                </div>

                {priceError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="text-[10px] text-amber-500 font-bold">{priceError}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Market Section - Mobile Optimized - Gradient Design */}
          <Card className="mb-4 sm:mb-6 gradient-card relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="gradient-overlay" />

            <CardHeader className="p-6 relative z-10 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold uppercase tracking-widest opacity-70">Markets</CardTitle>
              <div className="flex h-8 glass-morphism rounded-lg p-1">
                {marketCategories.slice(0, 3).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "px-3 text-[10px] font-bold rounded-md transition-all",
                      activeCategory === category.id
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-muted-foreground"
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 relative z-10">
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">

                {/* CRYPTO TAB */}
                <TabsContent value="crypto" className="mt-0">
                  {cryptoPrices?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300">
                      {cryptoPrices.map((crypto) => (
                        <CryptoCard key={crypto.id} crypto={crypto} />
                      ))}
                      {isLoadingPrices && <div className="fixed top-4 right-4 z-50"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
                    </div>
                  ) : isLoadingPrices ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-4 border-dashed border-primary/20 bg-primary/5">
                          <div className="flex items-center space-x-3 opacity-50">
                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                              <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
                      </div>
                      <p className="text-muted-foreground mb-2">
                        {priceError ? 'Connecting to price sources...' : 'Loading cryptocurrency prices...'}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {priceError || 'Please wait a moment'}
                      </p>
                      <Button
                        onClick={() => fetchPrices()}
                        variant="outline"
                        size="sm"
                        disabled={isLoadingPrices}
                      >
                        {isLoadingPrices ? 'Connecting...' : 'Retry Now'}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* STOCKS TAB */}
                <TabsContent value="stocks" className="mt-0">
                  {stockPrices?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300">
                      {stockPrices.map((stock) => (
                        <CryptoCard key={stock.id} crypto={stock} />
                      ))}
                    </div>
                  ) : isLoadingPrices ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-4 border-dashed border-primary/20 bg-primary/5">
                          <div className="flex items-center space-x-3 opacity-50">
                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                              <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Unable to load stock prices.</p>
                      <Button
                        onClick={() => fetchPrices()}
                        variant="outline"
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* FOREX TAB */}
                <TabsContent value="forex" className="mt-0">
                  {forexPrices?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300">
                      {forexPrices.map((forex: any) => (
                        <CryptoCard key={forex.id} crypto={forex} />
                      ))}
                    </div>
                  ) : isLoadingPrices ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-4 border-dashed border-primary/20 bg-primary/5">
                          <div className="flex items-center space-x-3 opacity-50">
                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                              <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Unable to load forex prices.</p>
                      <Button
                        onClick={() => fetchPrices()}
                        variant="outline"
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* PRECIOUS METALS TAB */}
                <TabsContent value="precious" className="mt-0">
                  {metalPrices?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300">
                      {metalPrices.map((metal: any) => (
                        <CryptoCard key={metal.id} crypto={metal} />
                      ))}
                    </div>
                  ) : isLoadingPrices ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="p-4 border-dashed border-primary/20 bg-primary/5">
                          <div className="flex items-center space-x-3 opacity-50">
                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                              <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Unable to load precious metals prices.</p>
                      <Button
                        onClick={() => fetchPrices()}
                        variant="outline"
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* TOP TAB (Combined top movers) */}
                <TabsContent value="top" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-emerald-600 dark:text-green-500" />
                        <span className="text-emerald-700 dark:text-green-500">Top Gainers</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prices
                          .filter((p: any) => p.price_change_percentage_24h > 0)
                          .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
                          .slice(0, 3)
                          .map((crypto) => (
                            <CryptoCard key={crypto.id} crypto={crypto} />
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center">
                        <TrendingDown className="h-5 w-5 mr-2 text-rose-600 dark:text-red-500" />
                        <span className="text-rose-700 dark:text-red-500">Top Losers</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prices
                          .filter((p: any) => p.price_change_percentage_24h < 0)
                          .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
                          .slice(0, 3)
                          .map((crypto) => (
                            <CryptoCard key={crypto.id} crypto={crypto} />
                          ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
      </div >
    </>
  );
}
