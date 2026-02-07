
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { WalletConnectionGuard } from '@/components/auth/wallet-connection-guard';

import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import TradingView chart to avoid SSR issues
const TradingViewChart = dynamic(
  () => import('./tradingview-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
);

interface TradingViewProps {
  symbol: string;
}

export function TradingView({ symbol }: TradingViewProps) {
  const router = useRouter();
  const { prices, selectedAsset, setSelectedAsset, setTradeModalOpen } = useTradingStore();
  const { refreshBalances } = useAuthStore();
  const { subscribe } = useRealtimeUser();
  const [priceData, setPriceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshBalances();

    const unsubscribeBalance = subscribe('balance:updated', () => {
      refreshBalances();
    });

    const unsubscribeUserBalance = subscribe('user:balance:updated', () => {
      refreshBalances();
    });

    return () => {
      unsubscribeBalance();
      unsubscribeUserBalance();
    };
  }, [refreshBalances, subscribe]);

  useEffect(() => {
    const asset = prices.find((p: any) => p.symbol === symbol);
    if (asset) {
      setSelectedAsset(asset);
      fetchDetailedPrice(symbol);
    } else {
      fetchDetailedPrice(symbol);
    }

    const interval = setInterval(() => {
      fetchDetailedPrice(symbol);
    }, 60000);

    return () => clearInterval(interval);
  }, [symbol, prices, setSelectedAsset]);

  const fetchDetailedPrice = async (assetSymbol: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prices/${assetSymbol.toLowerCase()}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPriceData(data.data);
      }
    } catch (error) {
      console.error('Error fetching detailed price:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = () => {
    router.push(`/trade/execute/${symbol.toLowerCase()}`);
  };

  const handleBack = () => {
    router.back();
  };

  const currentData = selectedAsset || priceData;
  const isPositive = (currentData?.price_change_percentage_24h || 0) >= 0;

  if (loading && !currentData) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <WalletConnectionGuard>
        <div className="min-h-screen gradient-subtle">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  className="h-12 w-12 rounded-2xl glass-card border-white/5 active:scale-90 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-3">
                  {currentData?.image ? (
                    <img
                      src={currentData.image}
                      alt={currentData.name}
                      className="w-12 h-12 rounded-2xl border border-white/10 shadow-2xl"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-white/10 shadow-2xl">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black tracking-tighter text-foreground leading-none">{symbol}/USDT</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">{currentData?.name}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleTrade}
                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all w-full sm:w-auto"
              >
                Express Execution
              </Button>
            </div>

            {/* Chart */}
            <Card className="glass-morphism mb-8 border-0 overflow-hidden shadow-2xl rounded-3xl">
              <CardContent className="p-0">
                <div className="bg-secondary/30 border-b border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black tracking-tighter">
                      ${(currentData?.current_price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: (currentData?.current_price || 0) < 1 ? 6 : 2
                      })}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {isPositive ? '+' : ''}{currentData?.price_change_percentage_24h?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-40">Live Data</span>
                  </div>
                </div>
                <TradingViewChart symbol={symbol} />
              </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="24h High"
                value={currentData?.high_24h ?? (currentData?.current_price * 1.02)}
                isCurrency
              />
              <MetricCard
                label="24h Low"
                value={currentData?.low_24h ?? (currentData?.current_price * 0.98)}
                isCurrency
              />
              <MetricCard
                label="24h Volume"
                value={currentData?.total_volume || 0}
                isCurrency
              />
              <MetricCard
                label="Market Cap"
                value={currentData?.market_cap || 0}
                isCurrency
              />
            </div>
          </div>
        </div>
      </WalletConnectionGuard>
    </>
  );
}

function MetricCard({ label, value, isCurrency }: { label: string, value: number, isCurrency?: boolean }) {
  return (
    <Card className="glass-card border-white/5">
      <CardContent className="p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-2">{label}</p>
        <p className="text-lg font-black tracking-tight text-foreground truncate">
          {isCurrency ? '$' : ''}{value?.toLocaleString(undefined, {
            minimumFractionDigits: value < 1 ? 4 : 2,
            maximumFractionDigits: value < 1 ? 6 : 2
          })}
        </p>
      </CardContent>
    </Card>
  );
}
