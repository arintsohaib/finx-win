
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Repeat,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Search,
  Filter,
  TrendingDownIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface ActivityItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'CONVERSION';
  timestamp: string;
  userId: string;
  userName: string;
  walletAddress: string;
  employeeName: string;
  currency?: string;
  amount?: number;
  fee?: number;
  status: string;
  tradeType?: 'BUY' | 'SELL';
  asset?: string;
  entryPrice?: number;
  openedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  result?: string;
  profitLoss?: number;
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: number;
  toAmount?: number;
  rate?: number;
  referenceId: string;
  metadata?: any;
  manualOutcomePreset?: string; // "WIN", "LOSS", or null
  manualPresetBy?: string;
  manualPresetAt?: string;
  duration?: string;
}

interface Employee {
  id: string;
  username: string;
  _count: {
    managedUsers: number;
  };
}

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setTimeLeft(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (isExpired) {
    return <span className="text-muted-foreground font-mono">Expired</span>;
  }

  return (
    <span className="font-mono font-bold text-orange-600 animate-pulse">
      {timeLeft} Left
    </span>
  );
};

export function SummaryTab({ realtimeSubscribe }: { realtimeSubscribe: any }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [activityType, setActivityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [processingTrade, setProcessingTrade] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployee, activityType]);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time events for instant updates
    const unsubscribeDeposit = realtimeSubscribe('deposit:created', handleRealtimeUpdate);
    const unsubscribeDepositUpdate = realtimeSubscribe('deposit:updated', handleRealtimeUpdate);
    const unsubscribeWithdrawal = realtimeSubscribe('withdrawal:created', handleRealtimeUpdate);
    const unsubscribeWithdrawalUpdate = realtimeSubscribe('withdrawal:updated', handleRealtimeUpdate);
    const unsubscribeTrade = realtimeSubscribe('trade:created', handleRealtimeUpdate);
    const unsubscribeTradeUpdate = realtimeSubscribe('trade:updated', handleRealtimeUpdate);
    const unsubscribeConversion = realtimeSubscribe('conversion:created', handleRealtimeUpdate);

    return () => {
      unsubscribeDeposit();
      unsubscribeDepositUpdate();
      unsubscribeWithdrawal();
      unsubscribeWithdrawalUpdate();
      unsubscribeTrade();
      unsubscribeTradeUpdate();
      unsubscribeConversion();
    };
  }, [realtimeSubscribe, selectedEmployee, activityType, searchQuery, currentPage]);

  const handleRealtimeUpdate = (data: any) => {
    console.log('[Summary] Real-time update received:', data);
    fetchActivities();
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      if (activityType !== 'all') {
        params.append('type', activityType);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add pagination parameters
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const url = `/api/admin/activities/summary?${params.toString()}`;

      // Use cookie-based authentication (httpOnly cookie set during login)
      // The browser automatically sends the admin_token cookie
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'include', // Important: includes cookies in request
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setEmployees(data.employees || []);

        // Update pagination info
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }

        setLastUpdated(new Date());
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toast.error(errorData.error || 'Failed to fetch activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error loading activities');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManualTradeResult = async (tradeId: string, outcome: 'win' | 'loss') => {
    try {
      setProcessingTrade(tradeId);

      // Use cookie-based authentication (httpOnly cookie set during login)
      const response = await fetch(`/api/admin/trades/manual-control`, {
        method: 'POST',
        credentials: 'include', // Important: includes cookies in request
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeId,
          outcome: outcome.toUpperCase(), // "WIN" or "LOSS"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Trade outcome preset to ${outcome.toUpperCase()}`,
          {
            description: 'The trade will continue running and apply this outcome when the timer expires.',
          }
        );

        // Refresh activities to show the preset badge
        fetchActivities();
      } else {
        toast.error(data.error || 'Failed to set outcome preset');
      }
    } catch (error) {
      console.error('Error setting outcome preset:', error);
      toast.error('Error processing request');
    } finally {
      setProcessingTrade(null);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'WITHDRAWAL':
        return <ArrowUpCircle className="h-4 w-4 text-orange-600" />;
      case 'TRADE':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'CONVERSION':
        return <Repeat className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, result?: string) => {
    if (result === 'WIN') {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Win</Badge>;
    }
    if (result === 'LOSS') {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Loss</Badge>;
    }
    if (result === 'TIE') {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Tie</Badge>;
    }

    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'adjusted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Adjusted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }

      // Show current page and neighbors
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const renderActivityDetails = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'DEPOSIT':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">Deposit</span>
              <Badge variant="outline">{activity.currency}</Badge>
              <span className="font-mono">{activity.amount?.toFixed(8)}</span>
            </div>
            {activity.metadata?.txHash && (
              <div className="text-xs text-muted-foreground">
                TX: {activity.metadata.txHash.slice(0, 12)}...
              </div>
            )}
          </div>
        );

      case 'WITHDRAWAL':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-600">Withdrawal</span>
              <Badge variant="outline">{activity.currency}</Badge>
              <span className="font-mono">{activity.amount?.toFixed(8)}</span>
              {activity.fee && (
                <span className="text-xs text-muted-foreground">
                  (Fee: {activity.fee.toFixed(8)})
                </span>
              )}
            </div>
            {activity.metadata?.destinationAddress && (
              <div className="text-xs text-muted-foreground">
                To: {activity.metadata.destinationAddress.slice(0, 12)}...
              </div>
            )}
          </div>
        );

      case 'TRADE':
        const isProcessing = processingTrade === activity.id;
        const isActive = activity.status.toLowerCase() === 'active';
        const hasPreset = activity.manualOutcomePreset;

        return (
          <div className="space-y-3">
            {/* Header: Type, Asset, Duration, Preset */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-blue-600">Trade</span>
              <Badge variant={activity.tradeType === 'BUY' ? 'default' : 'secondary'}>
                {activity.tradeType}
              </Badge>
              <span className="font-mono font-medium">{activity.asset}</span>

              {/* Duration Badge */}
              {activity.duration && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activity.duration}
                </Badge>
              )}

              {/* Manual Preset Badge */}
              {hasPreset && (
                <Badge
                  variant="outline"
                  className={`
                    text-xs font-bold px-2 py-0.5 border-none
                    ${hasPreset === 'WIN'
                      ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                      : 'bg-red-600 text-white shadow-sm hover:bg-red-700'
                    }
                  `}
                >
                  Pre-set: {hasPreset}
                </Badge>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>Entry: <span className="font-mono text-foreground">${activity.entryPrice?.toFixed(2)}</span></div>
              <div>Amount: <span className="font-mono text-foreground">{activity.amount?.toFixed(2)} USDT</span></div>

              <div>
                Opened: {activity.openedAt ? formatTimestamp(activity.openedAt) : 'N/A'}
              </div>

              {/* Expires At / Completed At */}
              {isActive && activity.expiresAt ? (
                <div className="flex items-center gap-1 text-orange-600 font-medium">
                  Expires: {formatTimestamp(activity.expiresAt)}
                </div>
              ) : (
                activity.completedAt && (
                  <div>Completed: {formatTimestamp(activity.completedAt)}</div>
                )
              )}

              {/* P/L for completed trades */}
              {activity.profitLoss !== null && activity.profitLoss !== undefined && (
                <div className={activity.profitLoss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  P/L: {activity.profitLoss >= 0 ? '+' : ''}{activity.profitLoss.toFixed(2)} USDT
                </div>
              )}
            </div>

            {/* Live Countdown for Active Trades */}
            {isActive && activity.expiresAt && (
              <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-md border border-border/50">
                <Clock className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
                <span className="text-xs font-medium">Time Left:</span>
                <CountdownTimer expiresAt={activity.expiresAt} />
              </div>
            )}

            {/* Manual Control Buttons for Active Trades */}
            {isActive && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground font-medium">Manual Control:</span>
                <Button
                  size="sm"
                  className="h-7 text-xs font-bold bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
                  onClick={() => handleManualTradeResult(activity.id, 'win')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  WIN
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-none shadow-sm"
                  onClick={() => handleManualTradeResult(activity.id, 'loss')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  LOSS
                </Button>
              </div>
            )}
          </div>
        );

      case 'CONVERSION':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">Conversion</span>
              <span className="font-mono text-sm">
                {activity.fromCurrency} → {activity.toCurrency}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {activity.fromAmount?.toFixed(8)} {activity.fromCurrency} = {activity.toAmount?.toFixed(8)} {activity.toCurrency}
            </div>
            <div className="text-xs text-muted-foreground">
              Rate: {activity.rate?.toFixed(8)}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Live Activity Summary</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                Real-time overview of all user activities
              </p>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="animate-pulse">●</span> Live Updates
              </span>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Last: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by UID, Wallet, Name, or Email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Activity Type Filter */}
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="trade">Trades</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="conversion">Conversions</SelectItem>
            </SelectContent>
          </Select>

          {/* Employee Filter */}
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.username} ({emp._count.managedUsers})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button onClick={fetchActivities} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          {loading && activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : activities.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Type</TableHead>
                    <TableHead className="w-[120px]">User</TableHead>
                    <TableHead className="w-[150px]">Employee</TableHead>
                    <TableHead className="min-w-[300px]">Activity Details</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{getActivityIcon(activity.type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{activity.userName}</div>
                          <div className="text-xs text-muted-foreground">
                            UID: {activity.userId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.employeeName}</Badge>
                      </TableCell>
                      <TableCell>{renderActivityDetails(activity)}</TableCell>
                      <TableCell>
                        {getStatusBadge(activity.status, activity.result)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No Activities Found</p>
              <p className="text-sm mt-1">
                {searchQuery || activityType !== 'all' || selectedEmployee !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'User activities will appear here in real-time'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between pt-4">
          {/* Info Text */}
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}
            </span>
            {' '}-{' '}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * itemsPerPage, totalCount)}
            </span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{totalCount}</span>
            {' '}entries
          </div>

          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={`cursor-pointer ${currentPage === 1
                      ? 'pointer-events-none opacity-50'
                      : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10'
                      }`}
                  />
                </PaginationItem>

                {/* Page Numbers */}
                {generatePageNumbers().map((page: any, index: any) => {
                  if (typeof page === 'string') {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className={`cursor-pointer ${currentPage === page
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent hover:from-purple-600 hover:to-pink-600'
                          : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10'
                          }`}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {/* Next Button */}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={`cursor-pointer ${currentPage === totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10'
                      }`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
