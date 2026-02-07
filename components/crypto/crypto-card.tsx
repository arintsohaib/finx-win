
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CryptoPrice } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useRouter } from 'next/navigation';

interface CryptoCardProps {
  crypto: CryptoPrice;
}

// Simple sparkline component
function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (!data?.length) {
    return (
      <div className="w-16 h-8 bg-muted rounded flex items-center justify-center">
        <div className="w-12 h-0.5 bg-muted-foreground/30 rounded"></div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value: any, index: any) => {
    const x = (index / (data.length - 1)) * 56; // 56px width
    const y = 24 - ((value - min) / range) * 20; // 24px height
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-14 h-6" viewBox="0 0 56 24" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={isPositive ? "#00D9C0" : "#EF4444"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export function CryptoCard({ crypto }: CryptoCardProps) {
  const { setSelectedAsset } = useTradingStore();
  const router = useRouter();
  const [animatedPrice, setAnimatedPrice] = useState(crypto.current_price ?? 0);

  const isPositive = (crypto.price_change_percentage_24h ?? 0) >= 0;

  useEffect(() => {
    // Animate price changes
    const currentPrice = crypto.current_price ?? 0;
    const duration = 1000;
    const steps = 30;
    const stepValue = (currentPrice - animatedPrice) / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep >= steps) {
        setAnimatedPrice(currentPrice);
        clearInterval(interval);
      } else {
        setAnimatedPrice(prev => prev + stepValue);
        currentStep++;
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [crypto.current_price, animatedPrice]);

  const handleClick = () => {
    setSelectedAsset(crypto);
    router.push(`/trade/${crypto.symbol.toLowerCase()}`);
  };

  return (
    <Card
      className="glass-card p-4 cursor-pointer hover:border-primary/50 transition-all duration-300 active:scale-[0.96] touch-manipulation relative overflow-hidden group"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4 relative z-10">
        {/* Modern Icon with Glow */}
        <div className="relative flex-shrink-0 group-hover:scale-110 transition-transform">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform" />
          {crypto.image ? (
            <div className="relative w-12 h-12 rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-black/20">
              <img
                src={crypto.image}
                alt={crypto.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center font-bold text-white text-base"
                style={{ display: crypto.image ? 'none' : 'flex' }}
              >
                {crypto.symbol.charAt(0)}
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/30 flex items-center justify-center font-bold text-white text-lg">
              {crypto.symbol.charAt(0)}
            </div>
          )}
        </div>

        {/* Info & Sparkline */}
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h3 className="font-extrabold text-sm tracking-tight text-foreground truncate">{crypto.symbol}</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60 truncate">{crypto.name}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Minimal Sparkline */}
            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
              <Sparkline
                data={crypto.sparkline_in_7d?.price || []}
                isPositive={isPositive}
              />
            </div>

            {/* Price section with bolder numbers */}
            <div className="text-right flex flex-col items-end">
              <span className="text-sm font-black tracking-tight">
                ${(animatedPrice ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: (crypto.current_price ?? 0) < 1 ? 6 : 2
                })}
              </span>
              <div className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5",
                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {isPositive ? '+' : ''}{crypto.price_change_percentage_24h?.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
