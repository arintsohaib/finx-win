
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users as UsersIcon, Search, ChevronLeft, ChevronRight, Wallet, TrendingUp, DollarSign, UserCog, UserCheck, Copy, Check, Briefcase, Ban, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  walletAddress: string;
  uid: string;
  createdAt: string;
  lastLogin: string | null;
  tradeStatus: string;
  customWinPercentage: string | null;
  customLossPercentage: string | null;
  kycStatus: string;
  tradeLimit: number;
  isSuspended: boolean;
  suspensionReason: string | null;
  assignedEmployee?: {
    id: string;
    username: string;
    email?: string;
  } | null;
  kycSubmissions?: Array<{
    fullName: string;
    email: string;
    status: string;
  }>;
  _count: {
    trades: number;
    deposits: number;
    withdrawals: number;
  };
  balances: Array<{
    currency: string;
    amount: string;
  }>;
}

interface Employee {
  id: string;
  username: string;
  email?: string;
  _count: {
    managedUsers: number;
  };
}

export function UsersTab() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, search, employeeFilter]);

  const fetchEmployees = async () => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/employees/list', {
        credentials: 'include',
        headers: {
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: search,
      });

      // Add employee filter if not "all"
      if (employeeFilter && employeeFilter !== 'all') {
        if (employeeFilter === 'unassigned') {
          params.append('unassigned', 'true');
        } else {
          params.append('employeeId', employeeFilter);
        }
      }

      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
        headers: {
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination.pages);
        setTotalUsers(data.pagination.total);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };



  const handleAssignEmployee = async (walletAddress: string, uid: string, employeeId: string | null) => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/users/assign-employee', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          employeeId: employeeId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        // Update local state
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign employee');
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
      toast.error('Failed to assign employee');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyWallet = (walletAddress: string) => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedWallet(walletAddress);
    toast.success('Wallet address copied to clipboard!');
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const handleTradeStatusChange = async (uid: string, newStatus: string, customWinPercentage?: number, customLossPercentage?: number, tradeLimit?: number) => {
    try {
      const body: any = { tradeStatus: newStatus };

      // Include custom percentages if status is 'custom'
      if (newStatus === 'custom') {
        body.customWinPercentage = customWinPercentage;
        body.customLossPercentage = customLossPercentage;
      }

      // Include trade limit if provided
      if (tradeLimit !== undefined) {
        body.tradeLimit = tradeLimit;
      }

      const response = await fetch(`/api/admin/users/${uid}/trade-status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Trade settings updated successfully`);
        // Update local state with response data
        setUsers(users.map((user: any) =>
          user.uid === uid ? {
            ...user,
            tradeStatus: data.user.tradeStatus,
            tradeLimit: data.user.tradeLimit,
            customWinPercentage: data.user.customWinPercentage,
            customLossPercentage: data.user.customLossPercentage
          } : user
        ));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update trade status');
      }
    } catch (error) {
      console.error('Error updating trade status:', error);
      toast.error('Failed to update trade status');
    }
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'win':
        return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300';
      case 'loss':
        return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-300';
      case 'custom':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-300';
    }
  };

  return (
    <TabsContent value="users" className="mt-0">
      <div className="space-y-4">
        {/* Header with Search and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">All Registered Users</h3>
              <p className="text-xs text-muted-foreground">
                Total: {totalUsers} users | Page {page} of {totalPages}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by UID, wallet, name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 w-72"
                />
              </div>
              <Button onClick={handleSearch} size="sm" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button onClick={fetchUsers} size="sm" variant="outline" disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Employee:</span>
            <Select
              value={employeeFilter}
              onValueChange={(value) => {
                setEmployeeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="unassigned">Unassigned Users</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.username} ({employee._count.managedUsers} users)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users List */}
        {loading && users.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.walletAddress} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* User Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-lg">
                              {user.kycSubmissions?.[0]?.fullName || `UID-${user.uid}`}
                            </p>
                            {user.kycStatus === 'approved' && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300 text-xs">
                                ✓ KYC Verified
                              </Badge>
                            )}
                            {user.isSuspended && (
                              <Badge variant="destructive" className="text-xs">
                                🚫 Suspended
                              </Badge>
                            )}
                          </div>
                          {user.kycSubmissions?.[0]?.email && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📧 {user.kycSubmissions[0].email}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-medium mt-1">
                            UID-{user.uid}
                          </p>
                          <button
                            onClick={() => handleCopyWallet(user.walletAddress)}
                            className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-primary transition-colors group mt-1"
                            title="Click to copy full address"
                          >
                            <span>{user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}</span>
                            {copiedWallet === user.walletAddress ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                        <div>
                          <p className="text-muted-foreground">Registered</p>
                          <p className="font-medium">{formatDate(user.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Login</p>
                          <p className="font-medium">{formatDate(user.lastLogin)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Activity</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <p className="text-xs font-medium">Trades</p>
                          </div>
                          <p className="text-lg font-bold">{user._count.trades}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                            <DollarSign className="h-3 w-3" />
                            <p className="text-xs font-medium">Deposits</p>
                          </div>
                          <p className="text-lg font-bold">{user._count.deposits}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
                            <DollarSign className="h-3 w-3" />
                            <p className="text-xs font-medium">Withdrawals</p>
                          </div>
                          <p className="text-lg font-bold">{user._count.withdrawals}</p>
                        </div>
                      </div>
                    </div>

                    {/* Management Controls */}
                    <div className="space-y-2">
                      {/* Employee Assignment */}
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          Assigned Employee
                        </p>
                        <Select
                          value={user.assignedEmployee?.id || 'unassigned'}
                          onValueChange={(value) => {
                            const employeeId = value === 'unassigned' ? null : value;
                            handleAssignEmployee(user.walletAddress, user.uid, employeeId);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {user.assignedEmployee
                                ? `${user.assignedEmployee.username}`
                                : 'Unassigned'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-muted-foreground">Unassigned</span>
                            </SelectItem>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {user.assignedEmployee && (
                          <p className="text-xs text-muted-foreground">
                            Managed by {user.assignedEmployee.username}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 mb-3 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Trade Status Control</p>
                        <select
                          value={user.tradeStatus}
                          onChange={(e) => handleTradeStatusChange(user.uid, e.target.value)}
                          className={`w-full px-3 py-2 text-sm font-semibold rounded-md border transition-colors ${getTradeStatusColor(user.tradeStatus)}`}
                        >
                          <option value="automatic">⚙️ Automatic</option>
                          <option value="win">✅ Win</option>
                          <option value="loss">❌ Loss</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          {user.tradeStatus === 'win' && '✅ User will win all trades'}
                          {user.tradeStatus === 'loss' && '❌ User will lose all trades'}
                          {user.tradeStatus === 'automatic' && '⚙️ Normal market-based results'}
                        </p>
                      </div>

                      {/* Trade Limit Control */}
                      <div className="space-y-2 mb-3 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Trades Remaining</span>
                          <span className="text-[10px] font-normal lowercase bg-muted px-1 rounded">Default is 50</span>
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            defaultValue={user.tradeLimit}
                            onBlur={async (e) => {
                              const newVal = parseInt(e.target.value);
                              if (!isNaN(newVal) && newVal !== user.tradeLimit) {
                                await handleTradeStatusChange(user.uid, user.tradeStatus, undefined, undefined, newVal);
                              }
                            }}
                            className="h-8 text-xs font-mono"
                            placeholder="Set trades remaining"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {user.tradeLimit <= 0 ? (
                            <span className="text-destructive font-medium">🚫 Trading blocked (0 left)</span>
                          ) : (
                            <span className="text-green-600 font-medium">✅ {user.tradeLimit} trades left</span>
                          )}
                        </p>
                        <p className="text-[7px] italic text-muted-foreground">
                          * Number reduces by 1 every time user places a trade.
                        </p>
                      </div>

                      {/* NEW: Balance Management Button */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/admin/users/${user.uid}`)}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                            size="sm"
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Manage User
                          </Button>
                        </div>
                        {user.balances && user.balances.length > 0 && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            {user.balances.length} wallet{user.balances.length !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UsersIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No Users Found</p>
            <p className="text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {users.length} of {totalUsers} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      size="sm"
                      variant={page === pageNum ? 'default' : 'outline'}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                size="sm"
                variant="outline"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
