'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/lib/stores/trading-store';
import { format } from 'date-fns';
import {
  Clock, TrendingUp, TrendingDown, ChevronRight, BarChart3,
  ChevronDown, ChevronUp, CalendarIcon, Loader2, CheckCircle2,
  DollarSign, TrendingUp as TrendingUpIcon, X
} from 'lucide-react';

interface ProfitStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTradeSelect: (tradeId: string) => void;
}

interface FinishedTrade {
  id: string;
  asset: string;
  side: string;
  entryPrice: string;
  exitPrice: string;
  amountUsd: string;
  duration: string;
  profitMultiplier: string;
  pnl: string;
  result: string;
  createdAt: Date;
  closedAt: Date;
  expiresAt: Date;
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const totalSeconds = Math.floor(difference / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

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
        setUrgency('critical');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={cn(
      "font-mono text-sm font-medium transition-colors",
      urgency === 'normal' && "text-green-500",
      urgency === 'warning' && "text-yellow-500",
      urgency === 'critical' && "text-red-500 animate-pulse"
    )}>
      {timeLeft}
    </span>
  );
}

// Expandable Trade Details Component - Mobile Optimized
function TradeDetailsExpanded({ trade }: { trade: FinishedTrade }) {
  const entryPrice = parseFloat(trade.entryPrice || '0');
  const exitPrice = parseFloat(trade.exitPrice || '0');
  const amountUsd = parseFloat(trade.amountUsd || '0');
  const pnl = parseFloat(trade.pnl || '0');
  const roi = amountUsd > 0 ? (pnl / amountUsd) * 100 : 0;
  const priceChange = exitPrice - entryPrice;
  const priceChangePercent = entryPrice > 0 ? (priceChange / entryPrice) * 100 : 0;

  // Calculate duration
  const createdAt = new Date(trade.createdAt);
  const closedAt = new Date(trade.closedAt);
  const durationMs = closedAt.getTime() - createdAt.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="mt-2 pt-2 border-t border-border">
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold mb-2">
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          <span>Detailed Breakdown</span>
        </div>

        {/* Basic Info - Mobile Stack Layout */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Trade ID</p>
            <p className="font-mono text-[10px] sm:text-xs truncate">{trade.id.slice(0, 8)}...</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Asset Pair</p>
            <p className="font-semibold text-xs sm:text-sm">{trade.asset}/USDT</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Direction</p>
            <p className={cn(
              "font-semibold text-xs sm:text-sm truncate",
              trade.side === 'buy' ? 'text-green-500' : 'text-red-500'
            )}>
              {trade.side === 'buy' ? '🟢 BUY' : '🔴 SELL'}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold text-xs sm:text-sm">${amountUsd.toFixed(2)}</p>
          </div>
        </div>

        {/* Price Information - Optimized Mobile Layout */}
        <div className="border-t border-border pt-2.5 space-y-2">
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Entry Price</p>
                <p className="font-mono font-semibold text-xs sm:text-sm truncate">${entryPrice.toFixed(6)}</p>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Entry Time</p>
                <p className="text-[10px] sm:text-xs truncate">{format(createdAt, 'MMM dd, HH:mm')}</p>
              </div>
            </div>

            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Exit Price</p>
                <p className="font-mono font-semibold text-xs sm:text-sm truncate">${exitPrice.toFixed(6)}</p>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Exit Time</p>
                <p className="text-[10px] sm:text-xs truncate">{format(closedAt, 'MMM dd, HH:mm')}</p>
              </div>
            </div>

            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Duration</p>
                <p className="font-semibold text-xs sm:text-sm">{durationStr}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profit/Loss Calculation - Mobile Optimized */}
        <div className="border-t border-border pt-2.5">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-semibold mb-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            <span>Profit/Loss Calculation</span>
          </div>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-[11px] sm:text-xs">Initial Amount:</span>
              <span className="font-semibold text-xs sm:text-sm">${amountUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-[11px] sm:text-xs">Final Amount:</span>
              <span className="font-semibold text-xs sm:text-sm">${(amountUsd + pnl).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 pt-1.5 sm:pt-2 border-t border-border">
              <span className="font-semibold text-xs sm:text-sm">Net P&L:</span>
              <span className={cn(
                "font-bold text-sm sm:text-base",
                pnl >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Status - Mobile Optimized */}
        <div className="pt-2 sm:pt-2.5 border-t border-border">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <CheckCircle2 className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
              trade.result === 'win' ? 'text-green-500' : 'text-red-500'
            )} />
            <span className="text-[11px] sm:text-sm font-semibold truncate">
              {trade.result === 'win' ? '✅ Completed Successfully' : '❌ Trade Closed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfitStatsModal({ open, onOpenChange, onTradeSelect }: ProfitStatsModalProps) {
  const { trades, activeTrades, isLoadingTrades, fetchTrades } = useTradingStore();

  // Pagination state
  const [displayedFinishedTrades, setDisplayedFinishedTrades] = useState<FinishedTrade[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter state
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [showCalendar, setShowCalendar] = useState(false);

  // Expanded trade details state
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  const INITIAL_LOAD = 5;
  const LOAD_MORE_COUNT = 4;

  // Fetch finished trades with pagination
  const fetchFinishedTrades = useCallback(async (offset: number, limit: number, append: boolean = false) => {
    try {
      setIsLoadingMore(true);

      let url = `/api/trades?status=finished&limit=${limit}&offset=${offset}`;

      // Add date filters if set
      if (dateRange.from) {
        url += `&startDate=${dateRange.from.toISOString()}`;
      }
      if (dateRange.to) {
        url += `&endDate=${dateRange.to.toISOString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const newTrades = data.trades || [];

        if (append) {
          setDisplayedFinishedTrades(prev => [...prev, ...newTrades]);
        } else {
          setDisplayedFinishedTrades(newTrades);
        }

        setHasMore(newTrades.length === limit);
      }
    } catch (error) {
      console.error('Error fetching finished trades:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [dateRange]);

  // Initial load
  useEffect(() => {
    if (open) {
      fetchTrades();
      setCurrentOffset(0);
      fetchFinishedTrades(0, INITIAL_LOAD, false);

      // Auto-refresh every 5 seconds while modal is open
      const interval = setInterval(() => {
        fetchTrades();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [open, fetchTrades, fetchFinishedTrades]);

  // Reload when date filter changes
  useEffect(() => {
    if (open) {
      setCurrentOffset(0);
      fetchFinishedTrades(0, INITIAL_LOAD, false);
    }
  }, [dateRange, open, fetchFinishedTrades]);

  const handleLoadMore = () => {
    const newOffset = currentOffset + LOAD_MORE_COUNT;
    setCurrentOffset(newOffset);
    fetchFinishedTrades(newOffset, LOAD_MORE_COUNT, true);
  };

  const handleQuickFilter = (filter: 'today' | 'last7' | 'last30' | 'all') => {
    const now = new Date();
    switch (filter) {
      case 'today':
        setDateRange({ from: new Date(now.setHours(0, 0, 0, 0)), to: new Date() });
        break;
      case 'last7':
        setDateRange({ from: new Date(now.setDate(now.getDate() - 7)), to: new Date() });
        break;
      case 'last30':
        setDateRange({ from: new Date(now.setDate(now.getDate() - 30)), to: new Date() });
        break;
      case 'all':
        setDateRange({ from: undefined, to: undefined });
        break;
    }
    setShowCalendar(false);
  };

  const handleResetFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setShowCalendar(false);
  };

  const finishedTrades = trades.filter((trade: any) => trade.status === 'finished');

  const totalPnL = finishedTrades.reduce((sum: any, trade: any) => {
    const pnlValue = typeof trade.pnl === 'string' ? trade.pnl : trade.pnl?.toString() || '0';
    return sum + parseFloat(pnlValue);
  }, 0);

  const winRate = finishedTrades.length > 0
    ? (finishedTrades.filter((trade: any) => trade.result === 'win').length / finishedTrades.length) * 100
    : 0;

  // Close modal on ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          sm:max-w-5xl 
          w-[95vw] 
          max-h-[85dvh] 
          flex flex-col
          overflow-hidden 
          glass-card 
          border-white/10 
          shadow-2xl
          p-0
          gap-0
        "
        closeIcon={false}
      >
        {/* Standardized Header */}
        <div className="relative p-4 border-b border-white/10 bg-muted/10 flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 hover:bg-foreground/10 rounded-full p-1.5 transition-colors z-50"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex items-center space-x-3 pr-8">
            <div className="gradient-icon-box w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white/10 bg-white/5">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-foreground">Trade Statistics</h2>
              <p className="text-xs text-muted-foreground line-clamp-1">
                Overview of your trading performance and active positions
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 overflow-y-auto">
          {/* Quick Stats Cards - Mobile Optimized - Gradient Design */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mb-3 sm:mb-4 md:mb-6 mt-2 sm:mt-3 md:mt-4">
            {/* P&L Card - Gradient design with status color */}
            <Card className="glass-card hover:shadow-lg transition-all">
              <CardContent className="p-2 sm:p-2.5 md:p-4 text-center">
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 truncate">Total P&L</p>
                <p className={cn(
                  "text-xs sm:text-sm md:text-base lg:text-lg font-bold truncate",
                  totalPnL >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Win Rate Card - Gradient design */}
            <Card className="glass-card hover:shadow-lg transition-all">
              <CardContent className="p-2 sm:p-2.5 md:p-4 text-center">
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 truncate">Win Rate</p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold gradient-text-simple truncate">
                  {winRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            {/* Total Trades Card - Gradient design */}
            <Card className="glass-card hover:shadow-lg transition-all">
              <CardContent className="p-2 sm:p-2.5 md:p-4 text-center">
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 truncate">Trades</p>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-foreground truncate">
                  {trades.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Trades Section - Mobile Optimized */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
                <span>Active Trades ({activeTrades.length})</span>
              </h3>
            </div>

            {activeTrades.length > 0 ? (
              <div className="space-y-2">
                {activeTrades.map((trade) => (
                  <Card
                    key={trade.id}
                    className="glass-card cursor-pointer touch-manipulation hover:shadow-lg transition-all"
                    onClick={() => onTradeSelect(trade.id)}
                  >
                    <CardContent className="p-2.5 sm:p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full gradient-icon-box text-white text-[10px] sm:text-xs flex-shrink-0 font-bold">
                            {trade.asset.slice(0, 3)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1 sm:space-x-2 mb-0.5">
                              <span className="font-semibold text-xs sm:text-sm truncate">{trade.asset}</span>
                              <span className={cn(
                                "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold",
                                trade.side === 'buy'
                                  ? 'bg-emerald-100 text-emerald-900 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-rose-100 text-rose-900 dark:bg-red-900 dark:text-red-300'
                              )}>
                                {trade.side.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              ${parseFloat(typeof trade.amountUsd === 'string' ? trade.amountUsd : trade.amountUsd?.toString() || '0').toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-[9px] sm:text-xs text-muted-foreground mb-0.5">Expires in</div>
                            <CountdownTimer expiresAt={typeof trade.expiresAt === 'string' ? trade.expiresAt : trade.expiresAt?.toISOString() || new Date().toISOString()} />
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="p-4 sm:p-6 text-center">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No active trades</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    Start trading to track your positions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Finished Trades Section - Mobile Optimized */}
          {displayedFinishedTrades.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                <h3 className="text-xs sm:text-sm font-semibold truncate">Recent Finished Trades</h3>
                {dateRange.from && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                    {format(dateRange.from, 'MMM dd')} - {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Now'}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {displayedFinishedTrades.map((trade) => {
                  const pnl = parseFloat(trade.pnl || '0');
                  const isWin = trade.result === 'win';
                  const isExpanded = expandedTradeId === trade.id;
                  const entryPrice = parseFloat(trade.entryPrice || '0');
                  const exitPrice = parseFloat(trade.exitPrice || '0');
                  const amount = parseFloat(trade.amountUsd || '0');

                  return (
                    <Card key={trade.id} className="glass-card hover:shadow-lg transition-all touch-manipulation">
                      <CardContent className="p-2.5 sm:p-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
                                {trade.asset.slice(0, 3)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1 sm:space-x-1.5 mb-0.5">
                                  <span className="text-xs sm:text-sm font-medium truncate">{trade.asset}</span>
                                  <span className={cn(
                                    "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold",
                                    trade.side === 'buy'
                                      ? 'bg-emerald-100 text-emerald-900 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-rose-100 text-rose-900 dark:bg-red-900 dark:text-red-300'
                                  )}>
                                    {trade.side.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  ${amount.toFixed(2)}
                                </div>
                                {/* Mobile: Hide prices by default, show in expanded view */}
                                <div className="text-[9px] sm:text-[10px] text-muted-foreground/80 truncate sm:hidden">
                                  E: ${entryPrice.toFixed(2)} • X: ${exitPrice.toFixed(2)}
                                </div>
                                {/* Desktop: Show full prices */}
                                <div className="hidden sm:block text-[10px] text-muted-foreground/80 truncate">
                                  Entry: ${entryPrice.toFixed(6)} • Exit: ${exitPrice.toFixed(6)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <div className="text-right">
                                <span className={cn(
                                  "text-xs sm:text-sm font-semibold block",
                                  isWin ? "text-green-500" : "text-red-500"
                                )}>
                                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground block">
                                  {format(new Date(trade.closedAt), 'MMM dd')}
                                </span>
                              </div>
                              {isWin ? (
                                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Show Trade Details Button - Mobile Optimized */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1.5 sm:mt-2 h-7 sm:h-8 text-[11px] sm:text-xs touch-manipulation active:bg-muted"
                            onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                          >
                            <BarChart3 className="h-3 w-3 mr-1 sm:mr-1.5 flex-shrink-0" />
                            <span className="truncate">{isExpanded ? 'Hide' : 'Show'} Trade Details</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 ml-auto flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" />
                            )}
                          </Button>

                          {/* Expanded Details */}
                          {isExpanded && <TradeDetailsExpanded trade={trade} />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Filter and Load More Buttons - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                    >
                      <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="truncate">Filter by Date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-auto p-3 sm:p-4" align="start">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h4 className="font-medium mb-2 text-xs sm:text-sm">Quick Filters</h4>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs touch-manipulation"
                            onClick={() => handleQuickFilter('today')}
                          >
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs touch-manipulation"
                            onClick={() => handleQuickFilter('last7')}
                          >
                            Last 7 Days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs touch-manipulation"
                            onClick={() => handleQuickFilter('last30')}
                          >
                            Last 30 Days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs touch-manipulation"
                            onClick={() => handleQuickFilter('all')}
                          >
                            All Time
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-xs sm:text-sm">Custom Range</h4>
                        <Calendar
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                          numberOfMonths={1}
                          className="rounded-md border text-xs sm:text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs touch-manipulation"
                          onClick={handleResetFilter}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          className="flex-1 h-8 text-xs touch-manipulation"
                          onClick={() => setShowCalendar(false)}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                  onClick={handleLoadMore}
                  disabled={!hasMore || isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin flex-shrink-0" />
                      <span className="truncate">Loading...</span>
                    </>
                  ) : hasMore ? (
                    <>
                      <TrendingUpIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="truncate hidden sm:inline">Load More Finished Trades ({LOAD_MORE_COUNT})</span>
                      <span className="truncate sm:hidden">Load More ({LOAD_MORE_COUNT})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="truncate">All Loaded</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

