
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Deposit {
  id: string;
  currency: string;
  cryptoAmount: number;
  usdtAmount: number;
  conversionRate: number;
  status: string;
  txHash: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  adminNotes: string | null;
}

interface Withdrawal {
  id: string;
  currency: string;
  cryptoAmount: number;
  usdtAmount: number;
  conversionRate: number;
  destinationAddress: string;
  status: string;
  txHash: string | null;
  fee: number;
  createdAt: string;
  processedAt: string | null;
  rejectedAt: string | null;
  adminNotes: string | null;
}

interface WalletHistoryProps {
  currency?: string;
}

export function WalletHistory({ currency }: WalletHistoryProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [currency]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [depositsRes, withdrawalsRes] = await Promise.all([
        fetch('/api/deposits'),
        fetch('/api/withdrawals')
      ]);

      if (depositsRes.ok) {
        const data = await depositsRes.json();
        let depositsData = Array.isArray(data.deposits) ? data.deposits : [];
        // Filter by currency if provided
        if (currency) {
          depositsData = depositsData.filter((d: Deposit) => d.currency === currency);
        }
        setDeposits(depositsData);
      } else {
        console.error('Failed to fetch deposits:', depositsRes.statusText);
        setDeposits([]);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        let withdrawalsData = Array.isArray(data.withdrawals) ? data.withdrawals : [];
        // Filter by currency if provided
        if (currency) {
          withdrawalsData = withdrawalsData.filter((w: Withdrawal) => w.currency === currency);
        }
        setWithdrawals(withdrawalsData);
      } else {
        console.error('Failed to fetch withdrawals:', withdrawalsRes.statusText);
        setWithdrawals([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setDeposits([]);
      setWithdrawals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-3 mt-4">
          {deposits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposit history</p>
            </div>
          ) : (
            deposits.map((deposit) => (
              <Card key={deposit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">Deposit</h4>
                          {getStatusBadge(deposit.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {deposit.cryptoAmount.toFixed(8)} {deposit.currency} → ${deposit.usdtAmount.toFixed(2)} USDT
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {deposit.createdAt ? formatDistanceToNow(new Date(deposit.createdAt), { addSuffix: true }) : 'Recently'}
                        </p>
                        {deposit.txHash && (
                          <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                            TX: {deposit.txHash}
                          </p>
                        )}
                        {deposit.adminNotes && (
                          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                            Admin: {deposit.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-3 mt-4">
          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal history</p>
            </div>
          ) : (
            withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                        <ArrowUpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">Withdrawal</h4>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${withdrawal.usdtAmount.toFixed(2)} USDT → {withdrawal.cryptoAmount.toFixed(8)} {withdrawal.currency}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {withdrawal.createdAt ? formatDistanceToNow(new Date(withdrawal.createdAt), { addSuffix: true }) : 'Recently'}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                          To: {withdrawal.destinationAddress}
                        </p>
                        {withdrawal.txHash && (
                          <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                            TX: {withdrawal.txHash}
                          </p>
                        )}
                        {withdrawal.adminNotes && (
                          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                            Admin: {withdrawal.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
