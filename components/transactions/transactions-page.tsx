
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, ArrowDown, ArrowUp, RefreshCw, ChevronDown, Loader2, ChevronRight, ExternalLink, Copy, FileText, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn, getFileUrl } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Transaction {
  id: string;
  type: string;
  currency?: string;
  amount: string;
  usdtAmount?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  txHash?: string;
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: string;
  toAmount?: string;
  rate?: string;
  asset?: string;
  result?: string;
  investmentAmount?: string;
  entryPrice?: string;
  exitPrice?: string;
  toAddress?: string;
  paymentProof?: string;
  adminNote?: string;
  approvedAt?: string;
  rejectedAt?: string;
  processedAt?: string;
  closedAt?: string;
  fee?: string;
  adjustedAmount?: string;
}

export function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchTransactions(0, true);
  }, [category, dateRange]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(0, true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [category, dateRange]);

  const fetchTransactions = async (newOffset: number = 0, reset: boolean = false) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: newOffset.toString(),
        _t: Date.now().toString(), // Cache buster
      });

      if (category !== 'all') {
        params.append('category', category);
      }

      if (dateRange.from) {
        params.append('startDate', dateRange.from.toISOString());
      }

      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const result = await response.json();

      if (result.success) {
        if (reset) {
          setTransactions(result.data);
        } else {
          setTransactions((prev) => [...prev, ...result.data]);
        }
        setHasMore(result.hasMore);
        setOffset(newOffset);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatLocalDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'MMM dd, yyyy HH:mm:ss');
  };

  const getTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const handleLoadMore = () => {
    fetchTransactions(offset + limit, false);
  };

  const handleBack = () => {
    router.back();
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'deposit' || type === 'trade-win') {
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    }
    return <ArrowUp className="h-5 w-5 text-red-500" />;
  };

  const getTransactionLabel = (tx: Transaction) => {
    switch (tx.type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'conversion':
        return `Convert ${tx.fromCurrency} → ${tx.toCurrency}`;
      case 'trade-win':
        return `Trade Win - ${tx.asset}`;
      case 'trade-loss':
        return `Trade Loss - ${tx.asset}`;
      default:
        return tx.type;
    }
  };

  const getTransactionAmount = (tx: Transaction) => {
    switch (tx.type) {
      case 'deposit':
      case 'withdrawal':
        if (tx.type === 'deposit' && tx.status === 'adjusted' && tx.adjustedAmount) {
          const amt = parseFloat(tx.adjustedAmount);
          return `${amt.toFixed(2)} USDT`;
        }
        const amt = parseFloat(tx.amount || '0');
        return `${amt.toFixed(8)} ${tx.currency}`;
      case 'conversion':
        const toAmt = parseFloat(tx.toAmount || '0');
        return `${toAmt.toFixed(8)} ${tx.toCurrency}`;
      case 'trade-win':
      case 'trade-loss':
        const pnl = parseFloat(tx.amount || '0');
        return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
      default:
        return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-amber-800 bg-amber-500/20 dark:text-amber-400 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20';
      case 'approved':
      case 'completed':
        return 'text-emerald-800 bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20';
      case 'rejected':
      case 'failed':
        return 'text-rose-800 bg-rose-500/20 dark:text-rose-400 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20';
      default:
        return 'text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
      case 'completed':
        return '✅';
      case 'rejected':
      case 'failed':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <Button
              variant="gradientGhost"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 min-h-[44px] min-w-[44px] flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold truncate gradient-text-simple">Transactions</h1>
          </div>
          <Button
            variant="gradientSecondary"
            size="icon"
            onClick={() => fetchTransactions(0, true)}
            disabled={isLoading}
            className="h-10 w-10 min-h-[44px] min-w-[44px] flex-shrink-0"
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters - Mobile Optimized */}
        <Card className="glass-card mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Category Filter */}
              <div className="flex-1">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm touch-manipulation">
                    <SelectValue placeholder="All Transactions" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    <SelectItem value="all" className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm">All Transactions</SelectItem>
                    <SelectItem value="deposit" className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm">Deposits</SelectItem>
                    <SelectItem value="withdrawal" className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm">Withdrawals</SelectItem>
                    <SelectItem value="conversion" className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm">Conversions</SelectItem>
                    <SelectItem value="trade" className="min-h-[48px] sm:min-h-[44px] text-base sm:text-sm">Trades</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="gradientSecondary"
                    className={cn(
                      'justify-start text-left font-normal min-h-[48px] sm:min-h-[44px] text-base sm:text-sm touch-manipulation',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <>
                          <span className="hidden xs:inline">Pick a date range</span>
                          <span className="xs:hidden">Date</span>
                        </>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range: any) => setDateRange(range || {})}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List - Mobile Optimized */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl gradient-text-simple">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoading && offset === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_: any, i: any) => (
                  <div key={i} className="p-4 border rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-20"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg hover:shadow-md transition-shadow touch-manipulation">
                    <div
                      className="p-3 sm:p-4 cursor-pointer active:bg-accent/50 transition-colors min-h-[72px]"
                      onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{getTransactionLabel(tx)}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {formatLocalDateTime(tx.createdAt)}
                            </p>
                            <p className="text-xs text-muted-foreground hidden xs:block truncate">
                              {getTimezone()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <p className={cn('font-semibold text-sm sm:text-base whitespace-nowrap',
                            tx.type === 'trade-win' || tx.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' :
                              tx.type === 'trade-loss' || tx.type === 'withdrawal' ? 'text-rose-600 dark:text-rose-400' : ''
                          )}>
                            {getTransactionAmount(tx)}
                          </p>
                          <span className={cn('text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 whitespace-nowrap', getStatusColor(tx.status))}>
                            <span>{getStatusIcon(tx.status)}</span>
                            <span className="capitalize">{tx.status}</span>
                          </span>
                          <ChevronRight className={cn('h-4 w-4 transition-transform', expandedTx === tx.id && 'rotate-90')} />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {expandedTx === tx.id && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="pt-4 space-y-3">
                          {/* Transaction ID */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{tx.id.substring(0, 16)}...</span>
                              <Button
                                variant="gradientGhost"
                                size="sm"
                                onClick={() => copyToClipboard(tx.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Deposit/Withdrawal Specific */}
                          {(tx.type === 'deposit' || tx.type === 'withdrawal') && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Crypto Amount:</span>
                                <span className="font-semibold">{parseFloat(tx.amount || '0').toFixed(8)} {tx.currency}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Original USDT:</span>
                                <span className={cn("font-semibold", tx.status === 'adjusted' && "line-through text-muted-foreground opacity-70")}>${parseFloat(tx.usdtAmount || '0').toFixed(2)}</span>
                              </div>
                              {tx.status === 'adjusted' && tx.adjustedAmount && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground font-medium text-blue-600 dark:text-blue-400">Adjusted Amount:</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">${parseFloat(tx.adjustedAmount).toFixed(2)}</span>
                                </div>
                              )}
                              {tx.txHash && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">TxHash:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">{tx.txHash.substring(0, 16)}...</span>
                                    <Button
                                      variant="gradientGhost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.txHash || '')}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {tx.toAddress && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">To Address:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">{tx.toAddress.substring(0, 16)}...</span>
                                    <Button
                                      variant="gradientGhost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.toAddress || '')}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Transaction Timeline */}
                              <div className="pt-3 border-t mt-3">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                  <Info className="h-4 w-4" />
                                  Transaction Timeline
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">Created</p>
                                      <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.createdAt)}</p>
                                    </div>
                                  </div>
                                  {tx.approvedAt && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-green-600">Approved ✅</p>
                                        <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.approvedAt)}</p>
                                      </div>
                                    </div>
                                  )}
                                  {tx.processedAt && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-green-600">Processed ✅</p>
                                        <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.processedAt)}</p>
                                      </div>
                                    </div>
                                  )}
                                  {tx.rejectedAt && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-red-600">Rejected ❌</p>
                                        <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.rejectedAt)}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Admin Notes - Prominently Displayed */}
                              {tx.adminNote && (
                                <div className="flex flex-col gap-2 text-sm pt-2 border-t">
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-yellow-600" />
                                    <span className="font-semibold text-yellow-700 dark:text-yellow-400">Admin Note</span>
                                  </div>
                                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded text-sm">
                                    {tx.adminNote}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Conversion Specific */}
                          {tx.type === 'conversion' && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">From:</span>
                                <span className="font-semibold">{parseFloat(tx.fromAmount || '0').toFixed(8)} {tx.fromCurrency}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">To:</span>
                                <span className="font-semibold">{parseFloat(tx.toAmount || '0').toFixed(8)} {tx.toCurrency}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Exchange Rate:</span>
                                <span className="font-semibold">{parseFloat(tx.rate || '0').toFixed(8)}</span>
                              </div>
                            </>
                          )}

                          {/* Trade Specific */}
                          {(tx.type === 'trade-win' || tx.type === 'trade-loss') && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Asset:</span>
                                <span className="font-semibold">{tx.asset}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Investment:</span>
                                <span className="font-semibold">${parseFloat(tx.investmentAmount || '0').toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Entry Price:</span>
                                <span className="font-semibold">${parseFloat(tx.entryPrice || '0').toFixed(6)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Exit Price:</span>
                                <span className="font-semibold">${parseFloat(tx.exitPrice || '0').toFixed(6)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">P&L:</span>
                                <span className={cn('font-semibold', parseFloat(tx.amount || '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                  {parseFloat(tx.amount || '0') >= 0 ? '+' : ''}${parseFloat(tx.amount || '0').toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Result:</span>
                                <span className={cn('font-black px-3 py-1 rounded-full text-[10px] tracking-widest shadow-sm',
                                  tx.result === 'win'
                                    ? 'bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : 'bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-400'
                                )}>
                                  {tx.result === 'win' ? 'WIN' : 'LOSS'}
                                </span>
                              </div>

                              {/* Trade Timeline */}
                              {tx.closedAt && (
                                <div className="pt-3 border-t mt-3">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Trade Timeline
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium">Trade Opened</p>
                                        <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.createdAt)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <div className={cn('w-2 h-2 rounded-full mt-1.5', tx.result === 'win' ? 'bg-green-500' : 'bg-red-500')}></div>
                                      <div className="flex-1">
                                        <p className={cn('text-xs font-medium', tx.result === 'win' ? 'text-green-600' : 'text-red-600')}>
                                          Trade Closed - {tx.result === 'win' ? 'Won ✅' : 'Lost ❌'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatLocalDateTime(tx.closedAt)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Timestamps */}
                          <div className="pt-2 border-t mt-2 space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Created:</span>
                              <span>{formatLocalDateTime(tx.createdAt)}</span>
                            </div>
                            {tx.updatedAt && tx.updatedAt !== tx.createdAt && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Updated:</span>
                                <span>{formatLocalDateTime(tx.updatedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Load More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No transactions found</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}