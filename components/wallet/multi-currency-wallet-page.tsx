'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Info } from 'lucide-react';
import { WalletCard } from './wallet-card';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { useCryptoPrices } from '@/hooks/use-crypto-prices';
import { SUPPORTED_CRYPTOS, TRADING_CURRENCY } from '@/lib/wallet-config';
import { toast } from 'sonner';


export function MultiCurrencyWalletPage() {
  const { user, refreshBalances } = useAuthStore();
  const { isConnected, subscribe } = useRealtimeUser();
  const { prices, loading: pricesLoading, fetchPrices, getPrice, getPriceChange } = useCryptoPrices();

  const [balances, setBalances] = useState<Record<string, any>>({});
  const [totalUsdValue, setTotalUsdValue] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [enabledCryptos, setEnabledCryptos] = useState<string[]>([]);

  // Fetch enabled cryptos from database
  const fetchEnabledCryptos = async () => {
    try {
      const response = await fetch('/api/crypto-wallets');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnabledCryptos(data.wallets.map((w: any) => w.currency));
        }
      }
    } catch (error) {
      console.error('[WALLET PAGE] Error fetching enabled cryptos:', error);
      // Fallback to all cryptos if fetch fails
      setEnabledCryptos(Object.keys(SUPPORTED_CRYPTOS));
    }
  };

  // Load balances on mount and when user or prices change
  useEffect(() => {
    fetchEnabledCryptos();
    loadBalances();
  }, []); // Run once on mount

  useEffect(() => {
    loadBalances();
  }, [user, prices]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing wallet balances and prices...');
      fetchPrices();
      loadBalances();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchPrices]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeBalance = subscribe('balance:updated', () => {
      if (process.env.NODE_ENV === 'development') console.log('Balance updated via real-time');
      refreshBalances().then(() => loadBalances());
    });

    const unsubscribeDeposit = subscribe('deposit:updated', () => {
      if (process.env.NODE_ENV === 'development') console.log('Deposit updated');
      refreshBalances().then(() => loadBalances());
    });

    const unsubscribeWithdrawal = subscribe('withdrawal:updated', () => {
      if (process.env.NODE_ENV === 'development') console.log('Withdrawal updated');
      refreshBalances().then(() => loadBalances());
    });

    const unsubscribeConversion = subscribe('conversion:completed', () => {
      if (process.env.NODE_ENV === 'development') console.log('Conversion completed');
      refreshBalances().then(() => loadBalances());
    });

    return () => {
      unsubscribeBalance();
      unsubscribeDeposit();
      unsubscribeWithdrawal();
      unsubscribeConversion();
    };
  }, [subscribe, refreshBalances]);

  const loadBalances = async () => {
    try {
      if (process.env.NODE_ENV === 'development') console.log('[WALLET PAGE] === LOADING BALANCES ===');
      const response = await fetch('/api/wallet/balances', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (process.env.NODE_ENV === 'development') console.log('[WALLET PAGE] Response status:', response.status);
      const data = await response.json();

      if (process.env.NODE_ENV === 'development') console.log('[WALLET PAGE] Received balance data:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('[WALLET PAGE] Setting balances state with:', data.balances);
        setBalances(data.balances);
        setTotalUsdValue(data.totalUsdValue);
        setPortfolioValue(data.totalPortfolioValue || 0);

        // Log each crypto balance
        Object.keys(data.balances).forEach((symbol: any) => {
          const bal = data.balances[symbol];
          console.log(`[WALLET PAGE] ${symbol}: amount=${bal.amount}, realBalance=${bal.realBalance}, hasBalance=${bal.amount > 0}`);
        });

        console.log('[WALLET PAGE] Balances state updated successfully');
        console.log('[WALLET PAGE] Portfolio Value (excluding USDT):', data.totalPortfolioValue);
      } else {
        console.error('[WALLET PAGE] Failed to load balances:', data.error);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('[WALLET PAGE] Error loading balances:', error);
    }
  };

  const handleWithdrawSuccess = () => {
    refreshBalances().then(() => loadBalances());
  };

  const tradingBalance = balances[TRADING_CURRENCY];

  return (
    <>
      <div className="min-h-screen gradient-subtle">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Portfolio Value Card - Modernized 2026 Style */}
          <Card className="glass-morphism mb-8 relative overflow-hidden border-0 shadow-2xl rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/5 to-transparent z-0" />

            <CardContent className="p-8 relative z-10 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">Estimated Net Worth</p>
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground">
                    ${(portfolioValue || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} <span className="text-xl sm:text-2xl text-muted-foreground ml-1">USDT</span>
                  </h2>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
                      Syncing Real-time
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      Secured
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex gap-3">
                  <Button variant="outline" className="flex-1 sm:flex-none h-14 px-8 rounded-2xl glass-card border-white/5 font-black uppercase tracking-widest text-xs">
                    History
                  </Button>
                  <Button className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                    Receive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Balance Alert - Minimalist 2026 */}
          <div className="glass-card mb-8 border-l-4 border-l-blue-500 p-5 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Liquidity Note</p>
              <p className="text-xs text-muted-foreground opacity-80 leading-relaxed">
                Only <span className="text-blue-500 font-bold">USDT</span> is used as collateral for trade execution. Use the Swap feature to rebalance your portfolio.
              </p>
            </div>
          </div>

          {/* Wallet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(SUPPORTED_CRYPTOS)
              .filter((crypto: any) => {
                // Only show enabled cryptos from database
                // If enabledCryptos is empty (still loading), show all
                return enabledCryptos.length === 0 || enabledCryptos.includes(crypto.symbol);
              })
              .sort((a, b) => {
                // USDT always comes first
                if (a.symbol === 'USDT') return -1;
                if (b.symbol === 'USDT') return 1;
                return 0;
              })
              .map((crypto) => {
                const balanceData = balances[crypto.symbol];

                return (
                  <WalletCard
                    key={crypto.symbol}
                    crypto={crypto}
                    balance={balanceData?.amount || 0}
                    usdValue={balanceData?.usdValue || 0}
                    priceChange24h={balanceData?.priceChange24h || 0}
                    currentPrice={balanceData?.currentPrice || 0}
                    onWithdrawSuccess={handleWithdrawSuccess}
                  />
                );
              })}
          </div>
        </div>
      </div>

    </>
  );
}
