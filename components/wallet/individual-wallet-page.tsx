
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { useCryptoPrices } from '@/hooks/use-crypto-prices';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { toast } from 'sonner';

interface IndividualWalletPageProps {
  currency: string;
}

export function IndividualWalletPage({ currency }: IndividualWalletPageProps) {
  const router = useRouter();
  const { user, refreshBalances } = useAuthStore();
  const { isConnected, subscribe } = useRealtimeUser();
  const { getPrice, getPriceChange } = useCryptoPrices();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);

  const cryptoConfig = SUPPORTED_CRYPTOS[currency];

  useEffect(() => {
    if (!cryptoConfig) {
      router.push('/wallet');
      return;
    }
    loadBalance();
  }, [user, currency, cryptoConfig]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeBalance = subscribe('balance:updated', () => {
      console.log('Balance updated via real-time');
      refreshBalances().then(() => loadBalance());
      toast.success('Balance updated!', { duration: 2000 });
    });

    const unsubscribeDeposit = subscribe('deposit:updated', () => {
      console.log('Deposit updated');
      refreshBalances().then(() => loadBalance());
    });

    const unsubscribeWithdrawal = subscribe('withdrawal:updated', () => {
      console.log('Withdrawal updated');
      refreshBalances().then(() => loadBalance());
    });

    return () => {
      unsubscribeBalance();
      unsubscribeDeposit();
      unsubscribeWithdrawal();
    };
  }, [subscribe, refreshBalances]);

  const loadBalance = () => {
    const userBalance = parseFloat(user?.balances?.[currency] || '0');
    setBalance(userBalance);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalances();
      loadBalance();
      toast.success('Balance refreshed!');
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBack = () => {
    router.push('/wallet');
  };

  const currentPrice = getPrice(currency);
  const priceChange = getPriceChange(currency);
  const usdValue = balance * currentPrice;
  const isPositiveChange = priceChange >= 0;

  if (!cryptoConfig) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="gradientGhost"
              size="sm"
              onClick={handleBack}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: cryptoConfig.color }}
              >
                {cryptoConfig.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{cryptoConfig.name}</h1>
                <p className="text-sm text-muted-foreground">{currency}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="glass-card mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-4xl font-bold">
                    {balance.toFixed(cryptoConfig.decimals)} {currency}
                  </h2>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-lg text-muted-foreground">
                    ≈ ${usdValue.toFixed(2)} USDT
                  </span>
                  <div className={`flex items-center space-x-1 text-sm ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveChange ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{Math.abs(priceChange).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-semibold">
                  ${currentPrice.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per {currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Button
            onClick={() => router.push(`/wallet/deposit/${currency.toLowerCase()}`)}
            className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Deposit {currency}
          </Button>

          <Button
            onClick={() => router.push(`/wallet/convert?from=${currency}`)}
            className="h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            Convert to USDT
          </Button>

          <Button
            onClick={() => router.push(`/wallet/withdraw/${currency.toLowerCase()}`)}
            disabled={balance <= 0}
            className="h-16 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            Withdraw / Send
          </Button>
        </div>

        {/* Info Card */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Asset Details</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage your {cryptoConfig.name} ({currency}) from here. You can deposit funds via the supported network,
              convert your assets to USDT for trading, or withdraw to an external wallet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
