
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { useTradingStore } from '@/lib/stores/trading-store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { WalletConnectionGuard } from '@/components/auth/wallet-connection-guard';
import { useRouter } from 'next/navigation';


interface TradeItemProps {
  trade: any;
  imageUrl?: string;
  onClick: () => void;
}

// Crypto Icon Component for Active Trades
function CryptoIconActive({ asset, imageUrl }: { asset: string, imageUrl?: string }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [asset, imageUrl]);

  const finalUrl = imageUrl || SUPPORTED_CRYPTOS[asset?.toUpperCase()]?.logoUrl;

  if (!finalUrl || imageError) {
    return (
      <div className="w-10 h-10 rounded-full gradient-icon-box flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#00D9C0]/30">
        {asset?.slice(0, 2) || 'N/A'}
      </div>
    );
  }

  return (
    <img
      src={finalUrl}
      alt={asset}
      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00D9C0]/30"
      onError={() => setImageError(true)}
    />
  );
}

// Crypto Icon Component for Finished Trades
function CryptoIconFinished({ asset, imageUrl }: { asset: string, imageUrl?: string }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [asset, imageUrl]);

  const finalUrl = imageUrl || SUPPORTED_CRYPTOS[asset?.toUpperCase()]?.logoUrl;

  if (!finalUrl || imageError) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-bold ring-2 ring-border/50">
        {asset?.slice(0, 2) || 'N/A'}
      </div>
    );
  }

  return (
    <img
      src={finalUrl}
      alt={asset}
      className="w-10 h-10 rounded-full object-cover ring-2 ring-border/50"
      onError={() => setImageError(true)}
    />
  );
}

// Safe date formatter to prevent hydration crashes
const safeFormat = (dateInput: string | Date | undefined, fmt: string): string => {
  try {
    if (!dateInput) return '—';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';
    return format(date, fmt);
  } catch (error) {
    return '—';
  }
};

// Memoized countdown timer to prevent re-renders
const CountdownTimer = React.memo(({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('—');
      return;
    }

    // Validate date first
    const expiryTimestamp = new Date(expiresAt).getTime();
    if (isNaN(expiryTimestamp)) {
      setTimeLeft('Error');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = expiryTimestamp - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeLeft(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
        } else {
          setTimeLeft(`${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
        }
      } else {
        setTimeLeft('Expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="font-mono text-sm text-foreground">
      {timeLeft}
    </span>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

// Memoized trade item to prevent re-renders when list updates
const ActiveTradeItem = React.memo(({ trade, imageUrl, onClick }: TradeItemProps) => {
  return (
    <Card
      onClick={onClick}
      className="glass-card mb-3 cursor-pointer hover:border-primary/50 transition-all duration-300 active:scale-[0.98] group relative overflow-hidden"
    >
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
              <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/20 transition-colors" />
              <CryptoIconActive asset={trade.asset} imageUrl={imageUrl} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm tracking-tight text-foreground truncate">{trade.asset || 'N/A'}/USDT</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                {safeFormat(trade.createdAt, 'MMM dd, HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full animate-pulse">
              Running
            </span>
            <CountdownTimer expiresAt={trade.expiresAt} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ActiveTradeItem.displayName = 'ActiveTradeItem';

// Memoized trade item to prevent re-renders when list updates
const FinishedTradeItem = React.memo(({ trade, imageUrl, onClick }: TradeItemProps) => {
  const pnl = parseFloat(trade.pnl || '0');
  const isProfit = pnl >= 0;

  return (
    <Card
      onClick={onClick}
      className="glass-card mb-3 cursor-pointer hover:border-primary/50 transition-all duration-300 active:scale-[0.98] group relative overflow-hidden"
    >
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-secondary/30 border border-secondary/10 flex items-center justify-center relative overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
              <CryptoIconFinished asset={trade.asset} imageUrl={imageUrl} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm tracking-tight text-foreground truncate">{trade.asset || 'N/A'}/USDT</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                {safeFormat(trade.createdAt, 'MMM dd, HH:mm:ss')}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-secondary/50 text-foreground px-2 py-0.5 rounded-full">
              Settled
            </span>
            <div className={cn(
              "text-sm font-black tracking-tight",
              isProfit ? "text-emerald-500" : "text-rose-500"
            )}>
              {isProfit ? '+' : ''}{pnl.toFixed(2)} USDT
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FinishedTradeItem.displayName = 'FinishedTradeItem';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Search className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground text-base">No Data</p>
    </div>
  );
}

export function ProfitStatistics() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trades, activeTrades, prices, fetchTrades, fetchPrices } = useTradingStore();
  const { user } = useAuthStore();

  // Read tab parameter from URL (defaults to 'active' if not specified)
  const initialTab = searchParams?.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(initialTab === 'finished' ? 'finished' : 'active');

  // Pagination state
  const [displayedActiveTrades, setDisplayedActiveTrades] = useState(10);
  const [displayedFinishedTrades, setDisplayedFinishedTrades] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'finished') {
      setActiveTab('finished');
    } else if (tabParam === 'active') {
      setActiveTab('active');
    }
  }, [searchParams]);

  // ✨ NEW: Real-Time Instant Feedback System
  const { subscribe } = useRealtimeUser();

  useEffect(() => {
    fetchTrades();
    fetchPrices();

    // Subscribe to real-time trade settlement events
    const unsubscribeTrade = subscribe('trade:settled', (data) => {
      console.log(`[Profit Stats] ⚡ Trade settled instantly! Refreshing...`);
      fetchTrades();
    });

    // Subscribe to balance updates (in case results impact balance display elsewhere)
    const unsubscribeBalance = subscribe('balance:updated', (data) => {
      console.log(`[Profit Stats] 💰 Balance updated, refreshing...`);
      fetchTrades();
    });

    // Polling fallback: Auto-refresh every 10 seconds (in case events are missed)
    const pollingInterval = setInterval(() => {
      fetchTrades();
    }, 10000);

    return () => {
      unsubscribeTrade();
      unsubscribeBalance();
      clearInterval(pollingInterval);
    };
  }, [fetchTrades, subscribe]);

  const finishedTrades = trades.filter((trade: any) => trade.status === 'finished');

  // Get sliced trades based on display count
  const visibleActiveTrades = activeTrades.slice(0, displayedActiveTrades);
  const visibleFinishedTrades = finishedTrades.slice(0, displayedFinishedTrades);

  // Check if there are more trades to load
  const hasMoreActiveTrades = activeTrades.length > displayedActiveTrades;
  const hasMoreFinishedTrades = finishedTrades.length > displayedFinishedTrades;

  const handleTradeClick = (trade: any) => {
    router.push(`/trade/details/${trade.id}`);
  };

  const handleLoadMoreActive = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedActiveTrades(prev => prev + 10);
      setIsLoadingMore(false);
    }, 300);
  };

  const handleLoadMoreFinished = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedFinishedTrades(prev => prev + 10);
      setIsLoadingMore(false);
    }, 300);
  };

  return (
    <>
      <WalletConnectionGuard>
        <div className="min-h-screen gradient-subtle">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 glass-morphism border-b bg-background/60 backdrop-blur-xl">
              <div className="flex items-center justify-center py-5 px-4">
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-foreground opacity-80">Activity Logs</h1>
              </div>

              {/* Tabs */}
              <div className="px-4 pb-3">
                <div className="flex bg-secondary/30 p-1 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === 'active' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground"
                    )}
                  >
                    Active Orders
                  </button>
                  <button
                    onClick={() => setActiveTab('finished')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === 'finished' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground"
                    )}
                  >
                    History
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pb-20">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="active" className="mt-0 p-4">
                  {activeTrades.length > 0 ? (
                    <div className="space-y-2">
                      {visibleActiveTrades.map((trade) => (
                        <ActiveTradeItem
                          key={trade.id}
                          trade={trade}
                          imageUrl={prices.find((p: any) => p.symbol === trade.asset.toUpperCase())?.image}
                          onClick={() => handleTradeClick(trade)}
                        />
                      ))}

                      {/* Load More Button for Active Trades */}
                      {hasMoreActiveTrades && (
                        <div className="flex justify-center pt-4">
                          <Button
                            onClick={handleLoadMoreActive}
                            disabled={isLoadingMore}
                            className="w-full glass-card border-2 border-[#00D9C0]/30 hover:border-[#00D9C0]/50"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Load More ({activeTrades.length - displayedActiveTrades} remaining)
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* All Loaded Message */}
                      {!hasMoreActiveTrades && activeTrades.length > 10 && (
                        <div className="flex justify-center pt-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-[#00D9C0]" />
                            All active trades loaded
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </TabsContent>

                <TabsContent value="finished" className="mt-0 p-4">
                  {finishedTrades.length > 0 ? (
                    <div className="space-y-2">
                      {visibleFinishedTrades.map((trade) => (
                        <FinishedTradeItem
                          key={trade.id}
                          trade={trade}
                          imageUrl={prices.find((p: any) => p.symbol === trade.asset.toUpperCase())?.image}
                          onClick={() => handleTradeClick(trade)}
                        />
                      ))}

                      {/* Load More Button for Finished Trades */}
                      {hasMoreFinishedTrades && (
                        <div className="flex justify-center pt-4">
                          <Button
                            onClick={handleLoadMoreFinished}
                            disabled={isLoadingMore}
                            className="w-full glass-card border-2 border-[#00D9C0]/30 hover:border-[#00D9C0]/50"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Load More ({finishedTrades.length - displayedFinishedTrades} remaining)
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* All Loaded Message */}
                      {!hasMoreFinishedTrades && finishedTrades.length > 10 && (
                        <div className="flex justify-center pt-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-[#00D9C0]" />
                            All finished trades loaded
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </WalletConnectionGuard>
    </>
  );
}
