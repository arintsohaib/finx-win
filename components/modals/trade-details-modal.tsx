
'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, DollarSign, Info } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TradeDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  trade: any;
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(100);
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const startTime = new Date(expiresAt).getTime() - (60 * 1000); // Assuming 60s duration
    const endTime = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = endTime - now;
      const totalDuration = endTime - startTime;

      if (difference > 0) {
        const totalSeconds = Math.floor(difference / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Calculate progress
        const progressPercent = ((endTime - now) / totalDuration) * 100;
        setProgress(Math.max(0, progressPercent));

        // Set urgency
        if (totalSeconds > 30) {
          setUrgency('normal');
        } else if (totalSeconds > 10) {
          setUrgency('warning');
        } else {
          setUrgency('critical');
        }

        if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      } else {
        setTimeLeft('Expired');
        setProgress(0);
        setUrgency('critical');
        if (onExpire) onExpire();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Time Remaining</span>
        <span className={cn(
          "font-mono text-lg font-bold transition-colors",
          urgency === 'normal' && "text-green-500",
          urgency === 'warning' && "text-yellow-500",
          urgency === 'critical' && "text-red-500 animate-pulse"
        )}>
          {timeLeft}
        </span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          urgency === 'critical' && "animate-pulse"
        )}
      />
      <div className="text-xs text-muted-foreground text-right">
        {progress.toFixed(0)}%
      </div>
    </div>
  );
}

export function TradeDetailsModal({ open, onOpenChange, onBack, trade }: TradeDetailsModalProps) {
  const [hasExpired, setHasExpired] = useState(false);

  if (!trade) return null;

  const entryPriceStr = typeof trade.entryPrice === 'string' ? trade.entryPrice : trade.entryPrice?.toString() || '0';
  const amountUsdStr = typeof trade.amountUsd === 'string' ? trade.amountUsd : trade.amountUsd?.toString() || '0';
  const entryPrice = parseFloat(entryPriceStr);
  const amountUsd = parseFloat(amountUsdStr);
  const profitMultiplier = parseFloat(trade.profitMultiplier.replace('%', '')) / 100;
  const potentialProfit = amountUsd * profitMultiplier;
  const potentialLoss = amountUsd * profitMultiplier;

  // Handle trade expiration
  const handleTradeExpire = async () => {
    if (hasExpired) return; // Prevent multiple triggers
    setHasExpired(true);

    // Show expiration toast
    const loadingToast = toast.loading('Trade Expired', {
      description: 'Calculating your trade result...'
    });

    // Wait 2 seconds for result calculation
    setTimeout(async () => {
      try {
        // Fetch the updated trade result
        const response = await fetch(`/api/trades?status=finished`);
        if (response.ok) {
          const data = await response.json();
          const finishedTrade = data.trades.find((t: any) => t.id === trade.id);

          if (finishedTrade) {
            const pnl = parseFloat(finishedTrade.pnl);
            const isWin = pnl > 0;

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show result toast
            toast.success(
              `Trade ${isWin ? 'Won! 🎉' : 'Closed'}`,
              {
                description: `Result: ${isWin ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`,
                duration: 4000
              }
            );
          }
        }
      } catch (error) {
        console.error('Error fetching trade result:', error);
      }

      // Close modal and go back to profit statistics
      onOpenChange(false);
      onBack();
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        sm:max-w-[500px] 
        flex flex-col
        overflow-hidden 
        glass-card
        border-white/10 
        p-0 
        gap-0
      " closeIcon={false}>
        {/* Standardized Header */}
        <div className="relative p-4 border-b border-white/10 bg-muted/10 flex-shrink-0">
          <button
            onClick={onBack}
            className="absolute left-4 top-4 hover:bg-foreground/10 rounded-full p-1.5 transition-colors z-10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex flex-col items-center justify-center text-center px-8">
            <h2 className="text-lg font-bold leading-tight text-foreground">{trade.asset}/USDT</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ring-1",
                trade.side === 'buy' ? 'bg-green-500/10 text-green-500 ring-green-500/20' : 'bg-red-500/10 text-red-500 ring-red-500/20'
              )}>
                {trade.side}
              </span>
              <p className="text-xs text-muted-foreground">Active Position Details</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          <div className="space-y-4 mt-4">
            {/* Status Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-green-500">Trade Active</span>
              </div>
            </div>

            {/* Trade Details Grid */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Entry Price</span>
                  <span className="font-mono font-semibold">${entryPrice.toFixed(6)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Trade Amount</span>
                  <span className="font-semibold">${amountUsd.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-semibold">{trade.duration}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Profit Level</span>
                  <span className="font-semibold gradient-text-simple">{trade.profitMultiplier}</span>
                </div>
              </CardContent>
            </Card>

            {/* Potential Outcomes */}
            <Card className="bg-gradient-to-br from-[#00D9C0]/5 to-cyan-500/5 border-[#00D9C0]/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Potential Profit</span>
                  </div>
                  <span className="font-semibold text-green-500">+${potentialProfit.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Potential Loss</span>
                  </div>
                  <span className="font-semibold text-red-500">-${potentialLoss.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Invested</span>
                    <span className="font-bold gradient-text-simple">${amountUsd.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Countdown Timer */}
            <Card className={cn(
              hasExpired && "border-red-500/50 bg-red-500/5"
            )}>
              <CardContent className="p-4">
                <CountdownTimer
                  expiresAt={typeof trade.expiresAt === 'string' ? trade.expiresAt : trade.expiresAt?.toISOString() || new Date().toISOString()}
                  onExpire={handleTradeExpire}
                />
                {hasExpired && (
                  <div className="mt-3 text-center text-sm text-red-500 font-semibold animate-pulse">
                    Trade has expired. Calculating result...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This trade will automatically close when the timer expires. The result will be calculated based on the closing price and shown in your Profit Statistics.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trade Timestamp */}
            <div className="text-center text-xs text-muted-foreground">
              Trade opened on {format(new Date(typeof trade.createdAt === 'string' ? trade.createdAt : trade.createdAt?.toISOString() || new Date().toISOString()), 'MMM dd, yyyy • HH:mm:ss')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
