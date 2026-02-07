
'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Send, History } from 'lucide-react';
import { CryptoConfig } from '@/lib/wallet-config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface WalletCardProps {
  key?: string;
  crypto: CryptoConfig;
  balance: number;
  usdValue: number;
  priceChange24h: number;
  currentPrice: number;
  onWithdrawSuccess?: () => void;
}

export function WalletCard({
  crypto,
  balance,
  usdValue,
  priceChange24h,
  currentPrice,
  onWithdrawSuccess,
}: WalletCardProps) {
  const hasBalance = balance > 0;
  const router = useRouter();
  const isUSDT = crypto.symbol === 'USDT';

  // Debug logging
  console.log(`[WALLET CARD] ${crypto.symbol}: balance = ${balance}, hasBalance = ${hasBalance} `);

  const handleDeposit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/wallet/deposit/${crypto.symbol.toLowerCase()}`);
  };

  const handleWithdraw = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasBalance) {
      router.push(`/wallet/withdraw/${crypto.symbol.toLowerCase()}`);
    }
  };

  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/wallet/convert?from=${crypto.symbol}`);
  };

  return (
    <>
      {/* Apply gradient design to all cards */}
      <Card className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300 active:scale-[0.98]">
        {/* Only USDT shows DEFAULT badge */}
        {isUSDT && (
          <div className="absolute top-4 right-4 z-10">
            <span className="text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary px-2 py-1 rounded-full backdrop-blur-md">
              Primary Asset
            </span>
          </div>
        )}

        <CardContent className="p-5 relative z-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-14 h-14 flex-shrink-0 group-hover:scale-110 transition-transform">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform" />
              {crypto.logoUrl ? (
                <div className="relative w-full h-full rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-black/20">
                  <img
                    src={crypto.logoUrl}
                    alt={crypto.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLDivElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center font-bold text-white text-lg hidden">
                    {crypto.symbol.charAt(0)}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/30 flex items-center justify-center font-bold text-white text-xl">
                  {crypto.symbol.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-lg tracking-tight text-foreground truncate">{crypto.symbol}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60 truncate">{crypto.name}</p>
            </div>
          </div>

          {/* Balance Section */}
          <div className="space-y-1 mb-6">
            <div className="text-3xl font-black tracking-tighter text-foreground">
              {(balance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto?.decimals || 2
              })}
            </div>
            {!isUSDT && usdValue > 0 && (
              <div className="text-xs font-bold text-muted-foreground opacity-80 bg-secondary/30 w-fit px-2 py-0.5 rounded-lg">
                ≈ ${usdValue.toFixed(2)} USDT
              </div>
            )}
          </div>

          {/* Actions - Modernized 2026 Style */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 font-bold text-[10px] uppercase tracking-widest transition-all"
              onClick={handleDeposit}
            >
              <ArrowDownLeft className="h-4 w-4 mr-1 text-emerald-500" />
              Deposit
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 font-bold text-[10px] uppercase tracking-widest transition-all"
              onClick={handleConvert}
            >
              <RefreshCw className="h-4 w-4 mr-1 text-blue-500" />
              Convert
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-rose-500/50 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 col-span-2"
              disabled={!hasBalance}
              onClick={handleWithdraw}
            >
              <ArrowUpRight className="h-4 w-4 mr-2 text-rose-500" />
              Send to External Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal wrappers removed in favor of page-based navigation */}
    </>
  );
}
