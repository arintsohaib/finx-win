'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ChevronLeft, Wallet, TrendingUp, DollarSign,
    ShieldAlert, CheckCircle, Ban, ArrowDownCircle,
    ArrowUpCircle, History, MessageSquare, Copy, Check, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';

interface UserDetail {
    walletAddress: string;
    uid: string;
    createdAt: string;
    lastLogin: string | null;
    tradeStatus: string;
    tradeLimit: number;
    isSuspended: boolean;
    suspensionReason: string | null;
    kycStatus: string;
    assignedEmployee?: {
        id: string;
        username: string;
    } | null;
    kycSubmissions?: Array<{
        fullName: string;
        email: string;
        status: string;
    }>;
    balances: Array<{
        currency: string;
        amount: string;
    }>;
}

const PRESET_REASONS = [
    "Violation of Terms of Service",
    "Suspicious trading activity detected",
    "Multiple fake deposits attempts",
    "Multiple failed verification attempts",
    "Account security compromise suspected",
    "Regulatory compliance issue",
    "Other"
];

export default function UserManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const userId = resolvedParams.id;
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();

    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
    const [stats, setStats] = useState({
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

    const { subscribe } = useRealtimeAdmin();

    // Balance Editing State
    const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
    const [newUsdtValue, setNewUsdtValue] = useState('');

    // Suspension State
    const [reasonType, setReasonType] = useState<string>("");
    const [customReason, setCustomReason] = useState("");

    useEffect(() => {
        if (!authLoading) {
            if (!admin) {
                router.push('/admin/login');
            } else {
                fetchUserDetails();
                fetchStats();

                const unsubDeposit = subscribe('deposit:created', () => fetchStats());
                const unsubWithdrawal = subscribe('withdrawal:created', () => fetchStats());

                return () => {
                    unsubDeposit();
                    unsubWithdrawal();
                };
            }
        }
    }, [admin, authLoading, userId, subscribe]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`/api/admin/stats?t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);

                // Initialize suspension fields
                if (data.user.isSuspended && data.user.suspensionReason) {
                    if (PRESET_REASONS.includes(data.user.suspensionReason)) {
                        setReasonType(data.user.suspensionReason);
                    } else {
                        setReasonType("Other");
                        setCustomReason(data.user.suspensionReason);
                    }
                }
            } else {
                toast.error('Failed to fetch user details');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            toast.error('Error loading user data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyWallet = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedWallet(address);
        toast.success('Address copied');
        setTimeout(() => setCopiedWallet(null), 2000);
    };

    const handleTradeStatusChange = async (newStatus: string) => {
        if (!user) return;
        try {
            setSaving(true);
            const response = await fetch(`/api/admin/users/${user.uid}/trade-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tradeStatus: newStatus }),
            });

            if (response.ok) {
                toast.success(`Trade status updated to ${newStatus}`);
                setUser({ ...user, tradeStatus: newStatus });
            }
        } catch (error) {
            toast.error('Failed to update trade status');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateBalance = async (currency: string, amount: number) => {
        if (!user) return;
        try {
            setSaving(true);
            // We use the USDT-based update API for convenience as in the modal
            const response = await fetch('/api/admin/wallets/update-by-usdt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: user.walletAddress,
                    uid: user.uid,
                    currency,
                    usdtValue: amount,
                }),
            });

            if (response.ok) {
                toast.success('Balance updated successfully');
                setEditingCurrency(null);
                fetchUserDetails();
            }
        } catch (error) {
            toast.error('Failed to update balance');
        } finally {
            setSaving(false);
        }
    };

    const handleSuspensionToggle = async () => {
        if (!user) return;
        const isSuspending = !user.isSuspended;

        let finalReason = null;
        if (isSuspending) {
            if (!reasonType) {
                toast.error("Please select a reason for suspension");
                return;
            }
            finalReason = reasonType === "Other" ? customReason : reasonType;
        }

        try {
            setSaving(true);
            const response = await fetch('/api/admin/users/suspend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    isSuspended: isSuspending,
                    suspensionReason: finalReason
                }),
            });

            if (response.ok) {
                toast.success(isSuspending ? 'User suspended' : 'User unsuspended');
                fetchUserDetails();
            }
        } catch (error) {
            toast.error('Failed to update suspension status');
        } finally {
            setSaving(false);
        }
    };


    return (
        <AdminLayout
            title={user ? `Manage User: ${user.kycSubmissions?.[0]?.fullName || `UID-${user.uid}`}` : 'User Management'}
            subtitle={user?.walletAddress || 'Synchronizing user data...'}
            actions={
                <Button variant="outline" size="sm" onClick={fetchUserDetails}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            }
        >
            {!user && !loading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <ShieldAlert className="h-12 w-12 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900">User Not Found</h2>
                    <p className="text-sm">The requested user ID could not be located in our database.</p>
                    <Button onClick={() => router.back()} variant="outline" className="mt-4">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            ) : user ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Stats & Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">UID</span>
                                    <span className="font-mono font-bold">{user.uid}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">KYC Status</span>
                                    <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'} className={user.kycStatus === 'approved' ? 'bg-green-600' : ''}>
                                        {user.kycStatus.toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Registered</span>
                                    <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Last Login</span>
                                    <span className="font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                                </div>
                                <div className="pt-4 border-t">
                                    <Label className="text-xs">Wallet Address</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-[10px] bg-slate-100 p-2 rounded flex-1 break-all">
                                            {user.walletAddress}
                                        </code>
                                        <Button size="icon" variant="ghost" onClick={() => handleCopyWallet(user.walletAddress)}>
                                            {copiedWallet === user.walletAddress ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Trade Control
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Override Status</Label>
                                    <Select value={user.tradeStatus} onValueChange={handleTradeStatusChange} disabled={saving}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="automatic">⚙️ Automatic</SelectItem>
                                            <SelectItem value="win">✅ Force Win</SelectItem>
                                            <SelectItem value="loss">❌ Force Loss</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        Overrides market logic for this specific user.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Trade Limit ({user.tradeLimit} left)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            defaultValue={user.tradeLimit}
                                            className="h-8"
                                            onBlur={async (e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val !== user.tradeLimit) {
                                                    // Update trade limit logic
                                                }
                                            }}
                                        />
                                        <Button size="sm">Update</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center/Right Column: Balances & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Wallet Balances</CardTitle>
                                    <CardDescription>Manage user funds across all currencies</CardDescription>
                                </div>
                                <Button variant="outline" size="sm">
                                    <History className="h-4 w-4 mr-2" />
                                    Audit Log
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Currency</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">USDT Value</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {user.balances.map((balance) => (
                                                <tr key={balance.currency} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{balance.currency}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        {parseFloat(balance.amount).toFixed(8)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        {/* We'd normally fetch real time rate here, for now using balance as is if USDT or placeholder */}
                                                        ${balance.currency === 'USDT' ? parseFloat(balance.amount).toFixed(2) : '---'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {editingCurrency === balance.currency ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={newUsdtValue}
                                                                    onChange={(e) => setNewUsdtValue(e.target.value)}
                                                                    className="w-24 h-8"
                                                                    autoFocus
                                                                />
                                                                <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleUpdateBalance(balance.currency, parseFloat(newUsdtValue))}>
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingCurrency(null)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingCurrency(balance.currency);
                                                                    setNewUsdtValue(balance.amount);
                                                                }}
                                                            >
                                                                <Edit2 className="h-3 w-3 mr-2" />
                                                                Adjust
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={user.isSuspended ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10'}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {user.isSuspended ? <ShieldAlert className="h-5 w-5 text-green-600" /> : <Ban className="h-5 w-5 text-red-600" />}
                                    Account Status: {user.isSuspended ? 'Suspended' : 'Active'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!user.isSuspended ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            Suspending this user will block all access to the trading platform. All active trades will be halted.
                                        </p>
                                        <div className="space-y-2">
                                            <Label>Suspension Reason</Label>
                                            <Select value={reasonType} onValueChange={setReasonType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a reason..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PRESET_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {reasonType === 'Other' && (
                                            <Textarea
                                                placeholder="Specify reason..."
                                                value={customReason}
                                                onChange={(e) => setCustomReason(e.target.value)}
                                                className="h-20"
                                            />
                                        )}
                                        <Button variant="destructive" className="w-full" onClick={handleSuspensionToggle} disabled={saving}>
                                            {saving ? 'Processing...' : 'Suspend Account'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-white border rounded">
                                            <p className="text-xs font-semibold text-muted-foreground">Current Reason:</p>
                                            <p className="text-sm mt-1">{user.suspensionReason}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Reactivating will restore full access immediately.
                                        </p>
                                        <Button variant="default" className="w-full bg-green-600 hover:bg-green-700" onClick={handleSuspensionToggle} disabled={saving}>
                                            {saving ? 'Processing...' : 'Unsuspend Account'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading user data...</p>
                </div>
            )}
        </AdminLayout>
    );
}

// Sub-components to keep imports clean
function Edit2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
        </svg>
    );
}
