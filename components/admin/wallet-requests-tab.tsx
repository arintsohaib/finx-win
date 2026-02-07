'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownCircle, ArrowUpCircle, CheckCircle, XCircle, Edit,
  Search, ChevronLeft, ChevronRight, Copy, Check, Calendar,
  Filter, X, RefreshCw, ZoomIn, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { buildImageUrlClient } from '@/lib/url-utils';
import { ImageLightbox } from '@/components/ui/image-lightbox';

const SUPPORTED_CRYPTOS = ['BTC', 'ETH', 'USDT', 'BNB', 'DOGE', 'LTC', 'XRP', 'ADA', 'SOL'];

interface WalletRequestsTabProps {
  realtimeSubscribe: any;
  stats: any;
  fetchStats: () => void;
}

export function WalletRequestsTab({ realtimeSubscribe, stats, fetchStats }: WalletRequestsTabProps) {
  const router = useRouter();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [txHashInput, setTxHashInput] = useState<Record<string, string>>({});
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Pagination
  const [allPage, setAllPage] = useState(1);
  const [allTotal, setAllTotal] = useState(0);
  const [allPages, setAllPages] = useState(1);
  const [depositPage, setDepositPage] = useState(1);
  const [depositTotal, setDepositTotal] = useState(0);
  const [depositPages, setDepositPages] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalTotal, setWithdrawalTotal] = useState(0);
  const [withdrawalPages, setWithdrawalPages] = useState(1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [allFilters, setAllFilters] = useState({
    status: 'all', // default to all for the combined view
    search: '',
    currency: '',
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
  });
  const [depositFilters, setDepositFilters] = useState({
    status: 'all', // default to all - show all deposits by default
    search: '',
    currency: '',
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
  });
  const [withdrawalFilters, setWithdrawalFilters] = useState({
    status: 'all', // default to all - show all withdrawals by default
    search: '',
    currency: '',
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    fetchAllTransactions();
    fetchDeposits();
    fetchWithdrawals();

    // Real-time subscriptions
    const unsubscribeDepositCreated = realtimeSubscribe('deposit:created', (data: any) => {
      toast.success('New deposit request received');
      fetchAllTransactions();
      fetchDeposits();
      fetchStats();
    });

    const unsubscribeDepositUpdated = realtimeSubscribe('deposit:updated', (data: any) => {
      fetchAllTransactions();
      fetchDeposits();
      fetchStats();
    });

    const unsubscribeWithdrawalCreated = realtimeSubscribe('withdrawal:created', (data: any) => {
      toast.success('New withdrawal request received');
      fetchAllTransactions();
      fetchWithdrawals();
      fetchStats();
    });

    const unsubscribeWithdrawalUpdated = realtimeSubscribe('withdrawal:updated', (data: any) => {
      fetchAllTransactions();
      fetchWithdrawals();
      fetchStats();
    });

    return () => {
      unsubscribeDepositCreated();
      unsubscribeDepositUpdated();
      unsubscribeWithdrawalCreated();
      unsubscribeWithdrawalUpdated();
    };
  }, [allPage, allFilters, depositPage, depositFilters, withdrawalPage, withdrawalFilters, realtimeSubscribe, fetchStats]);

  useEffect(() => {
    fetchWithdrawals();
  }, [withdrawalPage, withdrawalFilters]);

  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: allPage.toString(),
        limit: '10',
        ...allFilters,
      });

      const response = await fetch(`/api/admin/wallet-transactions?${params}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setAllTransactions(data.transactions || []);
        setAllTotal(data.pagination.total);
        setAllPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: depositPage.toString(),
        limit: '10',
        ...depositFilters,
      });

      const response = await fetch(`/api/admin/deposits?${params}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits || []);
        setDepositTotal(data.pagination.total);
        setDepositPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Failed to fetch deposits');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: withdrawalPage.toString(),
        limit: '10',
        ...withdrawalFilters,
      });

      const response = await fetch(`/api/admin/withdrawals?${params}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
        setWithdrawalTotal(data.pagination.total);
        setWithdrawalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'adjusted':
        return <Badge className="bg-blue-600">Adjusted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const clearAllFilters = () => {
    setAllFilters({
      status: 'all',
      search: '',
      currency: '',
      fromDate: '',
      toDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setAllPage(1);
  };

  const clearDepositFilters = () => {
    setDepositFilters({
      status: 'pending',
      search: '',
      currency: '',
      fromDate: '',
      toDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setDepositPage(1);
  };

  const clearWithdrawalFilters = () => {
    setWithdrawalFilters({
      status: 'pending',
      search: '',
      currency: '',
      fromDate: '',
      toDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setWithdrawalPage(1);
  };

  const pendingDepositsCount = stats.pendingDeposits || 0;
  const pendingWithdrawalsCount = stats.pendingWithdrawals || 0;

  return (
    <TabsContent value="wallet-requests" className="mt-0">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Wallet Requests History</h3>
            <p className="text-xs text-muted-foreground">Complete history with advanced search and filters</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
              variant="outline"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              onClick={() => {
                fetchAllTransactions();
                fetchDeposits();
                fetchWithdrawals();
              }}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeSubTab === 'all'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            All
            {(pendingDepositsCount + pendingWithdrawalsCount) > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                {pendingDepositsCount + pendingWithdrawalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('deposits')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeSubTab === 'deposits'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Deposits
            {pendingDepositsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-500 rounded-full">
                {pendingDepositsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('withdrawals')}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeSubTab === 'withdrawals'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Withdrawals
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={
                    activeSubTab === 'all' ? allFilters.status :
                      activeSubTab === 'deposits' ? depositFilters.status :
                        withdrawalFilters.status
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, status: e.target.value });
                      setAllPage(1);
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, status: e.target.value });
                      setDepositPage(1);
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, status: e.target.value });
                      setWithdrawalPage(1);
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="adjusted">Adjusted</option>
                  <option value="rejected">Rejected</option>

                </select>
              </div>

              <div>
                <Label className="text-xs">Search (UID, Address, Name, or Email)</Label>
                <Input
                  placeholder="Search..."
                  value={
                    activeSubTab === 'all' ? allFilters.search :
                      activeSubTab === 'deposits' ? depositFilters.search :
                        withdrawalFilters.search
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, search: e.target.value });
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, search: e.target.value });
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, search: e.target.value });
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Cryptocurrency</Label>
                <select
                  value={
                    activeSubTab === 'all' ? allFilters.currency :
                      activeSubTab === 'deposits' ? depositFilters.currency :
                        withdrawalFilters.currency
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, currency: e.target.value });
                      setAllPage(1);
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, currency: e.target.value });
                      setDepositPage(1);
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, currency: e.target.value });
                      setWithdrawalPage(1);
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="">All Currencies</option>
                  {SUPPORTED_CRYPTOS.map((crypto: any) => (
                    <option key={crypto} value={crypto}>{crypto}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={
                    activeSubTab === 'all' ? allFilters.fromDate :
                      activeSubTab === 'deposits' ? depositFilters.fromDate :
                        withdrawalFilters.fromDate
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, fromDate: e.target.value });
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, fromDate: e.target.value });
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, fromDate: e.target.value });
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={
                    activeSubTab === 'all' ? allFilters.toDate :
                      activeSubTab === 'deposits' ? depositFilters.toDate :
                        withdrawalFilters.toDate
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, toDate: e.target.value });
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, toDate: e.target.value });
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, toDate: e.target.value });
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Min Amount (USDT)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={
                    activeSubTab === 'all' ? allFilters.minAmount :
                      activeSubTab === 'deposits' ? depositFilters.minAmount :
                        withdrawalFilters.minAmount
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, minAmount: e.target.value });
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, minAmount: e.target.value });
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, minAmount: e.target.value });
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Max Amount (USDT)</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={
                    activeSubTab === 'all' ? allFilters.maxAmount :
                      activeSubTab === 'deposits' ? depositFilters.maxAmount :
                        withdrawalFilters.maxAmount
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'all') {
                      setAllFilters({ ...allFilters, maxAmount: e.target.value });
                    } else if (activeSubTab === 'deposits') {
                      setDepositFilters({ ...depositFilters, maxAmount: e.target.value });
                    } else {
                      setWithdrawalFilters({ ...withdrawalFilters, maxAmount: e.target.value });
                    }
                  }}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={
                    activeSubTab === 'all' ? clearAllFilters :
                      activeSubTab === 'deposits' ? clearDepositFilters :
                        clearWithdrawalFilters
                  }
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* All Transactions Tab */}
        {activeSubTab === 'all' && (
          <div className="space-y-3">
            {loading && allTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : allTransactions.length > 0 ? (
              <>
                {allTransactions.map((transaction: any) => (
                  <Card key={`${transaction.type}-${transaction.id}`} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Header Row with Type Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Type Badge - Green for Deposit, Red for Withdraw */}
                            {transaction.type === 'deposit' ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border border-green-300 dark:border-green-700">
                                ↓ Deposit
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-700">
                                ↑ Withdraw
                              </Badge>
                            )}
                            <div className={`px-3 py-1 rounded font-semibold text-sm ${transaction.type === 'deposit'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                              }`}>
                              {transaction.currency}
                            </div>
                            {getStatusBadge(transaction.status)}
                            <p className="font-bold text-lg">
                              {parseFloat(transaction.cryptoAmount || 0).toFixed(8)} {transaction.currency}
                            </p>
                          </div>
                        </div>

                        {/* User Info with Copy */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">User</p>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{transaction.userDisplay}</p>
                                {transaction.hasKyc && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300 text-xs">
                                    ✓ KYC Verified
                                  </Badge>
                                )}
                              </div>
                              {transaction.userEmail && (
                                <p className="text-xs text-muted-foreground">
                                  📧 {transaction.userEmail}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground font-medium">
                                UID-{transaction.uid}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Wallet Address</p>
                            <button
                              onClick={() => handleCopyAddress(transaction.fullWalletAddress)}
                              className="flex items-center gap-1 text-xs font-mono hover:text-primary transition-colors"
                            >
                              {transaction.fullWalletAddress.slice(0, 10)}...{transaction.fullWalletAddress.slice(-8)}
                              {copiedAddress === transaction.fullWalletAddress ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Amount (USDT)</p>
                            <p className={`font-semibold ${transaction.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                              ${parseFloat(transaction.usdtAmount || 0).toFixed(2)}
                            </p>
                          </div>
                          {transaction.type === 'withdraw' && transaction.fee && (
                            <div>
                              <p className="text-muted-foreground text-xs">Fee</p>
                              <p className="text-xs">${parseFloat(transaction.fee || 0).toFixed(2)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground text-xs">Created</p>
                            <p className="text-xs">{formatTime(transaction.createdAt)}</p>
                          </div>
                          {transaction.processedAt && (
                            <div>
                              <p className="text-muted-foreground text-xs">Processed</p>
                              <p className="text-xs">{formatTime(transaction.processedAt)}</p>
                            </div>
                          )}
                          {transaction.processedBy && (
                            <div>
                              <p className="text-muted-foreground text-xs">Processed By</p>
                              <p className="text-xs font-semibold">{transaction.processedBy}</p>
                            </div>
                          )}
                        </div>

                        {/* Adjustment Details */}
                        {transaction.status === 'adjusted' && (
                          <div className="mt-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-xs mb-1">
                              <Edit className="h-3 w-3" />
                              ADJUSTMENT INFORMATION
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-muted-foreground">Original Amount</p>
                                <p className="font-semibold">${parseFloat(transaction.originalAmount || 0).toFixed(2)} USDT</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Adjusted Amount</p>
                                <p className="font-bold text-blue-600 dark:text-blue-400">${parseFloat(transaction.adjustedAmount || transaction.usdtAmount || 0).toFixed(2)} USDT</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Difference</p>
                                {(() => {
                                  const orig = parseFloat(transaction.originalAmount || 0);
                                  const adj = parseFloat(transaction.adjustedAmount || transaction.usdtAmount || 0);
                                  const diff = adj - orig;
                                  const perc = orig > 0 ? ((diff / orig) * 100).toFixed(2) : '0';
                                  return (
                                    <p className={`font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({perc}%)
                                    </p>
                                  );
                                })()}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Adjusted At</p>
                                <p className="font-semibold">{transaction.adjustedAt ? formatTime(transaction.adjustedAt) : transaction.processedAt ? formatTime(transaction.processedAt) : 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Transaction/Deposit Address */}
                        {transaction.type === 'deposit' ? (
                          <>
                            {/* Transaction Hash */}
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Transaction Hash</p>
                              {transaction.txHash ? (
                                <button
                                  onClick={() => handleCopyAddress(transaction.txHash)}
                                  className="flex items-center gap-1 font-mono text-xs break-all bg-muted px-2 py-1 rounded hover:bg-muted/80"
                                >
                                  {transaction.txHash}
                                  {copiedAddress === transaction.txHash ? (
                                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <Copy className="h-3 w-3 flex-shrink-0" />
                                  )}
                                </button>
                              ) : (
                                <p className="text-xs text-red-500">⚠️ Not provided</p>
                              )}
                            </div>

                            {/* Deposit Address */}
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Deposit Address</p>
                              <button
                                onClick={() => handleCopyAddress(transaction.depositAddress)}
                                className="flex items-center gap-1 font-mono text-xs break-all hover:text-primary"
                              >
                                {transaction.depositAddress}
                                {copiedAddress === transaction.depositAddress ? (
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 flex-shrink-0" />
                                )}
                              </button>
                            </div>

                            {/* Payment Proof Thumbnail */}
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Payment Proof</p>
                              {transaction.paymentScreenshot ? (
                                <ImageLightbox
                                  src={`/api/admin/view-payment-proof/${transaction.paymentScreenshot.split('/').pop()}`}
                                  alt="Payment Proof"
                                  trigger={
                                    <div className="relative w-36 h-24 rounded border border-primary/20 bg-muted/50 hover:border-primary/40 transition-all cursor-pointer overflow-hidden group">
                                      <Image
                                        src={`/api/admin/view-payment-proof/${transaction.paymentScreenshot.split('/').pop()}`}
                                        alt="Payment Proof"
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform"
                                        unoptimized
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  }
                                />
                              ) : (
                                <div className="w-36 h-24 rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground/50 mb-1" />
                                  <p className="text-xs text-muted-foreground text-center px-2">
                                    No payment proof uploaded
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Destination Address for withdrawals */}
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Destination Address</p>
                              <button
                                onClick={() => handleCopyAddress(transaction.destinationAddress)}
                                className="flex items-center gap-1 font-mono text-xs break-all hover:text-primary text-left"
                              >
                                {transaction.destinationAddress}
                                {copiedAddress === transaction.destinationAddress ? (
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 flex-shrink-0" />
                                )}
                              </button>
                            </div>
                            {/* Transaction Hash for withdrawals */}
                            {transaction.txHash && transaction.status !== 'pending' && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Transaction Hash</p>
                                <button
                                  onClick={() => handleCopyAddress(transaction.txHash)}
                                  className="flex items-center gap-1 font-mono text-xs break-all bg-muted px-2 py-1 rounded hover:bg-muted/80"
                                >
                                  {transaction.txHash}
                                  {copiedAddress === transaction.txHash ? (
                                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <Copy className="h-3 w-3 flex-shrink-0" />
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        )}


                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {
                          transaction.status === 'pending' ? (
                            <Button
                              onClick={() => router.push(`/admin/${transaction.type}s/${transaction.id}`)}
                              size="sm"
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[140px]"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Process Request
                            </Button>
                          ) : (
                            <Badge className={`min-w-[140px] justify-center py-2 ${transaction.status === 'approved' ? 'bg-green-600' :
                              transaction.status === 'adjusted' ? 'bg-blue-600' :
                                'bg-red-600'
                              }`}>
                              {transaction.status === 'approved' ? '✓ Approved' :
                                transaction.status === 'adjusted' ? '✓ Adjusted' :
                                  '✗ Rejected'}
                            </Badge>
                          )
                        }
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Pagination */}
                {allPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {allPage} of {allPages} (Total: {allTotal})
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setAllPage(p => Math.max(1, p - 1))}
                        disabled={allPage === 1}
                        size="sm"
                        variant="outline"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3 py-1 bg-muted rounded">{allPage}</span>
                      <Button
                        onClick={() => setAllPage(p => Math.min(allPages, p + 1))}
                        disabled={allPage === allPages}
                        size="sm"
                        variant="outline"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowDownCircle className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No Transactions Found</p>
                <p className="text-sm mt-1">Try adjusting your search filters</p>
              </div>
            )
            }
          </div>
        )}

        {/* Deposits Tab */}
        {
          activeSubTab === 'deposits' && (
            <div className="space-y-3">
              {loading && deposits.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : deposits.length > 0 ? (
                <>
                  {deposits.map((deposit: any) => (
                    <Card key={deposit.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="px-3 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                {deposit.currency}
                              </div>
                              {getStatusBadge(deposit.status)}
                              <p className="font-bold text-lg">
                                {parseFloat(deposit.cryptoAmount || 0).toFixed(8)} {deposit.currency}
                              </p>
                            </div>
                          </div>

                          {/* User Info with Copy */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">User</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold">{deposit.userDisplay}</p>
                                  {deposit.hasKyc && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300 text-xs">
                                      ✓ KYC Verified
                                    </Badge>
                                  )}
                                </div>
                                {deposit.userEmail && (
                                  <p className="text-xs text-muted-foreground">
                                    📧 {deposit.userEmail}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground font-medium">
                                  UID-{deposit.uid}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Wallet Address</p>
                              <button
                                onClick={() => handleCopyAddress(deposit.fullWalletAddress)}
                                className="flex items-center gap-1 text-xs font-mono hover:text-primary transition-colors"
                              >
                                {deposit.fullWalletAddress.slice(0, 10)}...{deposit.fullWalletAddress.slice(-8)}
                                {copiedAddress === deposit.fullWalletAddress ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Amount (USDT)</p>
                              <p className="font-semibold text-green-600">${parseFloat(deposit.usdtAmount || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Created</p>
                              <p className="text-xs">{formatTime(deposit.createdAt)}</p>
                            </div>
                            {deposit.processedAt && (
                              <div>
                                <p className="text-muted-foreground text-xs">Processed</p>
                                <p className="text-xs">{formatTime(deposit.processedAt)}</p>
                              </div>
                            )}
                            {deposit.processedBy && (
                              <div>
                                <p className="text-muted-foreground text-xs">Processed By</p>
                                <p className="text-xs font-semibold">{deposit.processedBy}</p>
                              </div>
                            )}
                          </div>

                          {/* Adjustment Details for Deposits Tab */}
                          {deposit.status === 'adjusted' && (
                            <div className="mt-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-2">
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-xs mb-1">
                                <Edit className="h-3 w-3" />
                                ADJUSTMENT INFORMATION
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Original Amount</p>
                                  <p className="font-semibold">${parseFloat(deposit.originalAmount || 0).toFixed(2)} USDT</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Adjusted Amount</p>
                                  <p className="font-bold text-blue-600 dark:text-blue-400">${parseFloat(deposit.adjustedAmount || deposit.usdtAmount || 0).toFixed(2)} USDT</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Difference</p>
                                  {(() => {
                                    const orig = parseFloat(deposit.originalAmount || 0);
                                    const adj = parseFloat(deposit.adjustedAmount || deposit.usdtAmount || 0);
                                    const diff = adj - orig;
                                    const perc = orig > 0 ? ((diff / orig) * 100).toFixed(2) : '0';
                                    return (
                                      <p className={`font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({perc}%)
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Adjusted At</p>
                                  <p className="font-semibold">{deposit.adjustedAt ? formatTime(deposit.adjustedAt) : deposit.processedAt ? formatTime(deposit.processedAt) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Transaction Hash */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Transaction Hash</p>
                            {deposit.txHash ? (
                              <button
                                onClick={() => handleCopyAddress(deposit.txHash)}
                                className="flex items-center gap-1 font-mono text-xs break-all bg-muted px-2 py-1 rounded hover:bg-muted/80"
                              >
                                {deposit.txHash}
                                {copiedAddress === deposit.txHash ? (
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 flex-shrink-0" />
                                )}
                              </button>
                            ) : (
                              <p className="text-xs text-red-500">⚠️ Not provided</p>
                            )}
                          </div>

                          {/* Deposit Address */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Deposit Address</p>
                            <button
                              onClick={() => handleCopyAddress(deposit.depositAddress)}
                              className="flex items-center gap-1 font-mono text-xs break-all hover:text-primary"
                            >
                              {deposit.depositAddress}
                              {copiedAddress === deposit.depositAddress ? (
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <Copy className="h-3 w-3 flex-shrink-0" />
                              )}
                            </button>
                          </div>

                          {/* Payment Proof Thumbnail */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Payment Proof</p>
                            {deposit.paymentScreenshot ? (
                              <a
                                href={`/api/admin/view-payment-proof/${deposit.paymentScreenshot.split('/').pop()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <div className="relative w-36 h-24 rounded border border-primary/20 bg-muted/50 hover:border-primary/40 transition-all cursor-pointer overflow-hidden group">
                                  <Image
                                    src={`/api/admin/view-payment-proof/${deposit.paymentScreenshot.split('/').pop()}`}
                                    alt="Payment Proof"
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                    unoptimized
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                              </a>
                            ) : (
                              <div className="w-36 h-24 rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground/50 mb-1" />
                                <p className="text-xs text-muted-foreground text-center px-2">
                                  No payment proof uploaded
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          {deposit.status === 'pending' ? (
                            <Button
                              onClick={() => router.push(`/admin/deposits/${deposit.id}`)}
                              size="sm"
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[140px]"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Process Deposit
                            </Button>
                          ) : (
                            <Badge className={`min-w-[140px] justify-center py-2 ${deposit.status === 'approved' ? 'bg-green-600' :
                              deposit.status === 'adjusted' ? 'bg-blue-600' :
                                'bg-red-600'
                              }`}>
                              {deposit.status === 'approved' ? '✓ Approved' :
                                deposit.status === 'adjusted' ? '✓ Adjusted' :
                                  '✗ Rejected'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Pagination */}
                  {depositPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {depositPage} of {depositPages} (Total: {depositTotal})
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                          disabled={depositPage === 1}
                          size="sm"
                          variant="outline"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-muted rounded">{depositPage}</span>
                        <Button
                          onClick={() => setDepositPage(p => Math.min(depositPages, p + 1))}
                          disabled={depositPage === depositPages}
                          size="sm"
                          variant="outline"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowDownCircle className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No Deposits Found</p>
                  <p className="text-sm mt-1">Try adjusting your search filters</p>
                </div>
              )}
            </div>
          )
        }

        {/* Withdrawals Tab */}
        {
          activeSubTab === 'withdrawals' && (
            <div className="space-y-3">
              {loading && withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : withdrawals.length > 0 ? (
                <>
                  {withdrawals.map((withdrawal: any) => (
                    <Card key={withdrawal.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="px-3 py-1 rounded bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-semibold text-sm">
                                {withdrawal.currency}
                              </div>
                              {getStatusBadge(withdrawal.status)}
                              <p className="font-bold text-lg">
                                {parseFloat(withdrawal.cryptoAmount || 0).toFixed(8)} {withdrawal.currency}
                              </p>
                            </div>
                          </div>

                          {/* User Info with Copy */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">User</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold">{withdrawal.userDisplay}</p>
                                  {withdrawal.hasKyc && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300 text-xs">
                                      ✓ KYC Verified
                                    </Badge>
                                  )}
                                </div>
                                {withdrawal.userEmail && (
                                  <p className="text-xs text-muted-foreground">
                                    📧 {withdrawal.userEmail}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground font-medium">
                                  UID-{withdrawal.uid}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Wallet Address</p>
                              <button
                                onClick={() => handleCopyAddress(withdrawal.fullWalletAddress)}
                                className="flex items-center gap-1 text-xs font-mono hover:text-primary transition-colors"
                              >
                                {withdrawal.fullWalletAddress.slice(0, 10)}...{withdrawal.fullWalletAddress.slice(-8)}
                                {copiedAddress === withdrawal.fullWalletAddress ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Amount (USDT)</p>
                              <p className="font-semibold text-orange-600">${parseFloat(withdrawal.usdtAmount || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Fee</p>
                              <p className="text-xs">${parseFloat(withdrawal.fee || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Created</p>
                              <p className="text-xs">{formatTime(withdrawal.createdAt)}</p>
                            </div>
                            {withdrawal.processedAt && (
                              <div>
                                <p className="text-muted-foreground text-xs">Processed</p>
                                <p className="text-xs">{formatTime(withdrawal.processedAt)}</p>
                              </div>
                            )}
                            {withdrawal.processedBy && (
                              <div>
                                <p className="text-muted-foreground text-xs">Processed By</p>
                                <p className="text-xs font-semibold">{withdrawal.processedBy}</p>
                              </div>
                            )}
                          </div>

                          {/* Destination Address */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Destination Address</p>
                            <button
                              onClick={() => handleCopyAddress(withdrawal.destinationAddress)}
                              className="flex items-center gap-1 font-mono text-xs break-all hover:text-primary"
                            >
                              {withdrawal.destinationAddress}
                              {copiedAddress === withdrawal.destinationAddress ? (
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <Copy className="h-3 w-3 flex-shrink-0" />
                              )}
                            </button>
                          </div>

                          {/* Transaction Hash Input (for pending) or Display (for processed) */}
                          {withdrawal.status === 'pending' ? (
                            <div>
                              <Label htmlFor={`tx-${withdrawal.id}`} className="text-xs">Transaction Hash (Optional)</Label>
                              <Input
                                id={`tx-${withdrawal.id}`}
                                placeholder="Enter transaction hash..."
                                value={txHashInput[withdrawal.id] || ''}
                                onChange={(e) => setTxHashInput({ ...txHashInput, [withdrawal.id]: e.target.value })}
                                className="mt-1 font-mono text-xs"
                              />
                            </div>
                          ) : withdrawal.txHash ? (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Transaction Hash</p>
                              <button
                                onClick={() => handleCopyAddress(withdrawal.txHash)}
                                className="flex items-center gap-1 font-mono text-xs break-all bg-muted px-2 py-1 rounded hover:bg-muted/80"
                              >
                                {withdrawal.txHash}
                                {copiedAddress === withdrawal.txHash ? (
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 flex-shrink-0" />
                                )}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          {withdrawal.status === 'pending' ? (
                            <Button
                              onClick={() => router.push(`/admin/withdrawals/${withdrawal.id}`)}
                              size="sm"
                              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white min-w-[140px]"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Process Payout
                            </Button>
                          ) : (
                            <Badge className="min-w-[140px] justify-center py-2">
                              {withdrawal.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Pagination */}
                  {withdrawalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {withdrawalPage} of {withdrawalPages} (Total: {withdrawalTotal})
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setWithdrawalPage(p => Math.max(1, p - 1))}
                          disabled={withdrawalPage === 1}
                          size="sm"
                          variant="outline"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-muted rounded">{withdrawalPage}</span>
                        <Button
                          onClick={() => setWithdrawalPage(p => Math.min(withdrawalPages, p + 1))}
                          disabled={withdrawalPage === withdrawalPages}
                          size="sm"
                          variant="outline"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpCircle className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No Withdrawals Found</p>
                  <p className="text-sm mt-1">Try adjusting your search filters</p>
                </div>
              )}
            </div>
          )
        }

      </div>
    </TabsContent>
  );
}
