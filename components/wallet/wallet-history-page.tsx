

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Eye,
  RefreshCw,
  Filter,
  Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  currency: string;
  amount: string;
  usdtValue: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  transactionHash?: string;
  address?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
  proofUrl?: string;
}

// Crypto Icon Component
function CryptoIcon({ currency }: { currency: string }) {
  const [imageError, setImageError] = useState(false);
  const cryptoConfig = SUPPORTED_CRYPTOS[currency?.toUpperCase()];

  useEffect(() => {
    setImageError(false);
  }, [currency]);

  if (!cryptoConfig?.logoUrl || imageError) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D9C0] to-blue-500 flex items-center justify-center text-white text-xs font-bold">
        {currency?.slice(0, 2) || 'N/A'}
      </div>
    );
  }

  return (
    <img
      src={cryptoConfig.logoUrl}
      alt={currency}
      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00D9C0]/30"
      onError={() => setImageError(true)}
    />
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-yellow-500/10 dark:text-yellow-500 dark:border-yellow-500/20' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20' },
    rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20' },
    failed: { label: 'Failed', className: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function WalletHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Pagination
  const [depositPage, setDepositPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const itemsPerPage = 10;

  // Summary stats
  const [stats, setStats] = useState({
    totalDeposited: 0,
    totalWithdrawn: 0,
    pendingTransactions: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Fetch deposits
      const depositsRes = await fetch('/api/deposits');
      const depositsData = await depositsRes.json();

      // Fetch withdrawals
      const withdrawalsRes = await fetch('/api/withdrawals');
      const withdrawalsData = await withdrawalsRes.json();

      // Map deposits to Transaction format
      const mappedDeposits: Transaction[] = (depositsData.deposits || []).map((d: any) => {
        let status: Transaction['status'] = 'pending';
        if (d.approvedAt) status = 'approved';
        else if (d.rejectedAt) status = 'rejected';

        return {
          id: d.id,
          type: 'deposit' as const,
          currency: d.currency,
          amount: d.cryptoAmount?.toString() || '0',
          usdtValue: d.usdtAmount || 0,
          status,
          transactionHash: d.transactionHash || undefined,
          address: d.depositAddress || undefined,
          createdAt: d.createdAt,
          approvedAt: d.approvedAt || undefined,
          rejectedAt: d.rejectedAt || undefined,
          notes: d.adminNotes || undefined,
          proofUrl: d.proofUrl || undefined,
        };
      });

      // Map withdrawals to Transaction format
      const mappedWithdrawals: Transaction[] = (withdrawalsData.withdrawals || []).map((w: any) => {
        let status: Transaction['status'] = 'pending';
        if (w.processedAt) status = 'completed';
        else if (w.rejectedAt) status = 'rejected';

        return {
          id: w.id,
          type: 'withdrawal' as const,
          currency: w.currency,
          amount: w.cryptoAmount?.toString() || '0',
          usdtValue: w.usdtAmount || 0,
          status,
          transactionHash: w.transactionHash || undefined,
          address: w.toAddress || undefined,
          createdAt: w.createdAt,
          approvedAt: w.processedAt || undefined,
          rejectedAt: w.rejectedAt || undefined,
          notes: w.adminNotes || undefined,
        };
      });

      setDeposits(mappedDeposits);
      setWithdrawals(mappedWithdrawals);

      // Calculate stats
      const totalDeposited = mappedDeposits
        .filter((d: any) => d.status === 'approved' || d.status === 'completed')
        .reduce((sum: any, d: any) => sum + d.usdtValue, 0);

      const totalWithdrawn = mappedWithdrawals
        .filter((w: any) => w.status === 'approved' || w.status === 'completed')
        .reduce((sum: any, w: any) => sum + w.usdtValue, 0);

      const pendingTransactions = [
        ...mappedDeposits,
        ...mappedWithdrawals
      ].filter((t: any) => t.status === 'pending').length;

      setStats({
        totalDeposited,
        totalWithdrawn,
        pendingTransactions,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const filterTransactions = (transactions: Transaction[]) => {
    return transactions.filter((tx: any) => {
      const matchesSearch =
        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.transactionHash?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchesCurrency = currencyFilter === 'all' || tx.currency === currencyFilter;

      return matchesSearch && matchesStatus && matchesCurrency;
    });
  };

  const paginateTransactions = (transactions: Transaction[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  const filteredDeposits = filterTransactions(deposits);
  const filteredWithdrawals = filterTransactions(withdrawals);

  const paginatedDeposits = paginateTransactions(filteredDeposits, depositPage);
  const paginatedWithdrawals = paginateTransactions(filteredWithdrawals, withdrawalPage);

  const totalDepositPages = Math.ceil(filteredDeposits.length / itemsPerPage);
  const totalWithdrawalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);

  // Get unique currencies for filter
  const allCurrencies = Array.from(
    new Set([...deposits, ...withdrawals].map((tx: any) => tx.currency))
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="gradientGhost"
          size="icon"
          onClick={() => router.push('/wallet')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text-simple">
            Wallet History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all your deposit and withdrawal transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransactions}
          disabled={loading}
          className="hidden sm:flex"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="gradient-border-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Deposited</p>
                <p className="text-2xl font-bold gradient-text-simple">
                  ${stats.totalDeposited.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">USDT</p>
              </div>
              <div className="p-3 gradient-icon-box rounded-full">
                <ArrowDownCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-border-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Withdrawn</p>
                <p className="text-2xl font-bold gradient-text-simple">
                  ${stats.totalWithdrawn.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">USDT</p>
              </div>
              <div className="p-3 gradient-icon-box rounded-full">
                <ArrowUpCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-border-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Transactions</p>
                <p className="text-2xl font-bold gradient-text-simple">
                  {stats.pendingTransactions}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </div>
              <div className="p-3 gradient-icon-box rounded-full">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, currency, or hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {allCurrencies.map((currency: any) => (
                  <SelectItem key={currency} value={currency}>
                    {currency.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 dark:bg-muted border border-border/60 dark:border-border">
          <TabsTrigger
            value="deposits"
            className="data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white dark:data-[state=active]:bg-[#00D9C0] dark:data-[state=active]:text-white data-[state=inactive]:text-foreground/70"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Deposit History
          </TabsTrigger>
          <TabsTrigger
            value="withdrawals"
            className="data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white dark:data-[state=active]:bg-[#00D9C0] dark:data-[state=active]:text-white data-[state=inactive]:text-foreground/70"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Withdrawal History
          </TabsTrigger>
        </TabsList>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <Card className="border-border/60 dark:border-border shadow-sm">
            <CardHeader className="border-b border-border/40 dark:border-border bg-muted/30 dark:bg-muted/10">
              <CardTitle className="text-lg font-semibold">Deposit Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#00D9C0]" />
                </div>
              ) : paginatedDeposits.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No deposit transactions found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-border/60 dark:border-border">
                          <th className="text-left p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Date</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Currency</th>
                          <th className="text-right p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Amount</th>
                          <th className="text-right p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">USDT Value</th>
                          <th className="text-center p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Status</th>
                          <th className="text-center p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDeposits.map((deposit) => (
                          <tr key={deposit.id} className="border-b border-border/40 dark:border-border hover:bg-muted/50 transition-colors">
                            <td className="p-4 text-sm">
                              {format(new Date(deposit.createdAt), 'MMM dd, yyyy')}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(deposit.createdAt), 'hh:mm a')}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <CryptoIcon currency={deposit.currency} />
                                <span className="font-medium">{deposit.currency.toUpperCase()}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium">
                              {deposit.amount}
                            </td>
                            <td className="p-4 text-right font-medium">
                              ${deposit.usdtValue.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <StatusBadge status={deposit.status} />
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                variant="gradientGhost"
                                size="sm"
                                onClick={() => handleViewDetails(deposit)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalDepositPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm text-muted-foreground">
                        Showing {(depositPage - 1) * itemsPerPage + 1} to{' '}
                        {Math.min(depositPage * itemsPerPage, filteredDeposits.length)} of{' '}
                        {filteredDeposits.length} results
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                          disabled={depositPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDepositPage(p => Math.min(totalDepositPages, p + 1))}
                          disabled={depositPage === totalDepositPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card className="border-border/60 dark:border-border shadow-sm">
            <CardHeader className="border-b border-border/40 dark:border-border bg-muted/30 dark:bg-muted/10">
              <CardTitle className="text-lg font-semibold">Withdrawal Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#00D9C0]" />
                </div>
              ) : paginatedWithdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No withdrawal transactions found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-border/60 dark:border-border">
                          <th className="text-left p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Date</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Currency</th>
                          <th className="text-right p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Amount</th>
                          <th className="text-right p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">USDT Value</th>
                          <th className="text-center p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Status</th>
                          <th className="text-center p-4 text-sm font-semibold text-foreground/80 dark:text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedWithdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id} className="border-b border-border/40 dark:border-border hover:bg-muted/50 transition-colors">
                            <td className="p-4 text-sm">
                              {format(new Date(withdrawal.createdAt), 'MMM dd, yyyy')}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(withdrawal.createdAt), 'hh:mm a')}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <CryptoIcon currency={withdrawal.currency} />
                                <span className="font-medium">{withdrawal.currency.toUpperCase()}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium">
                              {withdrawal.amount}
                            </td>
                            <td className="p-4 text-right font-medium">
                              ${withdrawal.usdtValue.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <StatusBadge status={withdrawal.status} />
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                variant="gradientGhost"
                                size="sm"
                                onClick={() => handleViewDetails(withdrawal)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalWithdrawalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm text-muted-foreground">
                        Showing {(withdrawalPage - 1) * itemsPerPage + 1} to{' '}
                        {Math.min(withdrawalPage * itemsPerPage, filteredWithdrawals.length)} of{' '}
                        {filteredWithdrawals.length} results
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalPage(p => Math.max(1, p - 1))}
                          disabled={withdrawalPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalPage(p => Math.min(totalWithdrawalPages, p + 1))}
                          disabled={withdrawalPage === totalWithdrawalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text-simple text-xl">
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4 gradient-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <CryptoIcon currency={selectedTransaction.currency} />
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {selectedTransaction.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-white/70 capitalize">
                      {selectedTransaction.type}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedTransaction.status} />
              </div>

              {/* Transaction Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="font-semibold">{selectedTransaction.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">USDT Value</p>
                    <p className="font-semibold">${selectedTransaction.usdtValue.toFixed(2)}</p>
                  </div>
                </div>

                {selectedTransaction.transactionHash && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
                    <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                      {selectedTransaction.transactionHash}
                    </p>
                  </div>
                )}

                {selectedTransaction.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {selectedTransaction.type === 'deposit' ? 'From Address' : 'To Address'}
                    </p>
                    <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                      {selectedTransaction.address}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created At</p>
                    <p className="text-sm">
                      {format(new Date(selectedTransaction.createdAt), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                  {selectedTransaction.approvedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Approved At</p>
                      <p className="text-sm">
                        {format(new Date(selectedTransaction.approvedAt), 'MMM dd, yyyy hh:mm a')}
                      </p>
                    </div>
                  )}
                </div>

                {selectedTransaction.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted p-3 rounded">{selectedTransaction.notes}</p>
                  </div>
                )}

                {selectedTransaction.proofUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payment Proof</p>
                    <img
                      src={selectedTransaction.proofUrl}
                      alt="Payment proof"
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

