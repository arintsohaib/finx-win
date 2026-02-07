'use client';

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoCard } from '@/components/crypto/crypto-card';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { WalletConnectionGuard } from '@/components/auth/wallet-connection-guard';
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';

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
  const [serverPortfolioValue, setServerPortfolioValue] = useState<number | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // REVERTED: Calculate real-time portfolio value on client side
  // This caused crashes when prices were null. Reverting to server-only value.
  const portfolioValue = React.useMemo(() => {
    return serverPortfolioValue;
  }, [serverPortfolioValue]);

  // Fetch portfolio value (server-side backup)
  const fetchPortfolioValue = async () => {
    if (!user?.walletAddress) return;

    try {
      setIsLoadingPortfolio(true);
      const response = await fetch('/api/wallet/balances');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.totalPortfolioValue !== undefined) {
          setServerPortfolioValue(data.totalPortfolioValue);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch portfolio value:', error);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user?.walletAddress) {
      fetchPortfolioValue();
      const interval = setInterval(fetchPortfolioValue, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user?.walletAddress]);

  // Fetch prices on mount
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Categorized prices
  const cryptoPrices = prices.filter(p => !forexSymbols.includes(p.symbol) && !metalSymbols.includes(p.symbol) && !stockSymbols.includes(p.symbol));
  const forexPrices = prices.filter(p => forexSymbols.includes(p.symbol));
  const metalPrices = prices.filter(p => metalSymbols.includes(p.symbol));
  const stockPrices = prices.filter(p => stockSymbols.includes(p.symbol));

  return (
    <>
      <WalletConnectionGuard>
        <DashboardErrorBoundary>
          <div className="min-h-screen gradient-subtle">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
              {/* Portfolio Card - Modernized for 2026 */}
              <Card className="mb-6 glass-card overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-70">Portfolio Net Worth</p>
                        {(isInitializing || (isLoadingPortfolio && portfolioValue === null)) ? (
                          <div className="flex items-center gap-3 mt-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="text-lg font-medium">Calculating...</span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <p className="text-4xl font-extrabold tracking-tight gradient-text">
                              ${(portfolioValue || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">USDT EQUIVALENT</p>
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
              <Card className="mb-4 sm:mb-6 glass-card relative overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="gradient-overlay" />

                <CardHeader className="p-4 sm:p-6 relative z-10 border-none shadow-none ring-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.6)]"></div>
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground/40 leading-none">Market Terminal</CardTitle>
                      </div>
                      <p className="text-[9px] text-muted-foreground/40 font-bold mt-2 hidden sm:block uppercase tracking-[0.15em]">Global Electronic Exchange</p>
                    </div>

                    <div className="relative grid grid-cols-5 p-1 bg-background/30 dark:bg-white/5 backdrop-blur-2xl rounded-2xl border-none shadow-none ring-0 overflow-hidden w-full sm:w-auto min-w-[350px]">
                      {/* Pixel-Perfect Grid Indicator */}
                      <div
                        className="absolute top-1 bottom-1 left-1 bg-primary shadow-[0_4px_20px_rgba(var(--primary),0.4)] dark:shadow-[0_0_25px_rgba(var(--primary),0.3)] rounded-xl transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-0"
                        style={{
                          width: `calc(100% / 5 - 1.6px)`,
                          transform: `translateX(${marketCategories.findIndex(c => c.id === activeCategory) * 100}%)`,
                          opacity: marketCategories.findIndex(c => c.id === activeCategory) !== -1 ? 1 : 0
                        }}
                      />

                      {marketCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={cn(
                            "relative z-10 h-10 text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center active:scale-90 touch-manipulation",
                            activeCategory === category.id
                              ? "text-white"
                              : "text-muted-foreground/60 hover:text-foreground/80"
                          )}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 relative z-10">
                  <div className="w-full">
                    {/* CRYPTO TAB content renders if activeCategory === 'crypto' */}
                    {activeCategory === 'crypto' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoadingPrices ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_: any, i: any) => (
                              <Card key={i} className="p-4">
                                <div className="flex items-center space-x-3 animate-pulse">
                                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                    <div className="h-3 bg-muted rounded w-1/3"></div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded w-16"></div>
                                    <div className="h-3 bg-muted rounded w-12"></div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : cryptoPrices?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cryptoPrices.map((crypto) => (
                              <CryptoCard key={crypto.id} crypto={crypto} />
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
                      </div>
                    )}

                    {/* STOCKS TAB content renders if activeCategory === 'stocks' */}
                    {activeCategory === 'stocks' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoadingPrices ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_: any, i: any) => (
                              <Card key={i} className="p-4">
                                <div className="flex items-center space-x-3 animate-pulse">
                                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                    <div className="h-3 bg-muted rounded w-1/3"></div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded w-16"></div>
                                    <div className="h-3 bg-muted rounded w-12"></div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : stockPrices?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stockPrices.map((stock) => (
                              <CryptoCard key={stock.id} crypto={stock} />
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
                      </div>
                    )}

                    {/* FOREX TAB content renders if activeCategory === 'forex' */}
                    {activeCategory === 'forex' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoadingPrices ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_: any, i: any) => (
                              <Card key={i} className="p-4">
                                <div className="flex items-center space-x-3 animate-pulse">
                                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                    <div className="h-3 bg-muted rounded w-1/3"></div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded w-16"></div>
                                    <div className="h-3 bg-muted rounded w-12"></div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : forexPrices?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {forexPrices.map((forex) => (
                              <CryptoCard key={forex.id} crypto={forex} />
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
                      </div>
                    )}

                    {/* PRECIOUS METALS content renders if activeCategory === 'precious' */}
                    {activeCategory === 'precious' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isLoadingPrices ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(4)].map((_: any, i: any) => (
                              <Card key={i} className="p-4">
                                <div className="flex items-center space-x-3 animate-pulse">
                                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                    <div className="h-3 bg-muted rounded w-1/3"></div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded w-16"></div>
                                    <div className="h-3 bg-muted rounded w-12"></div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : metalPrices?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {metalPrices.map((metal) => (
                              <CryptoCard key={metal.id} crypto={metal} />
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
                      </div>
                    )}

                    {/* TOP TAB content renders if activeCategory === 'top' */}
                    {activeCategory === 'top' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DashboardErrorBoundary>
      </WalletConnectionGuard>
    </>
  );
}
