'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ChevronLeft, ArrowUpCircle, CheckCircle,
    XCircle, Copy, Check, Calendar, User,
    ExternalLink, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';

interface Withdrawal {
    id: string;
    uid: string;
    userDisplay: string;
    userEmail: string | null;
    walletAddress: string;
    currency: string;
    cryptoAmount: number;
    usdtAmount: number;
    fee: number;
    status: string;
    txHash: string | null;
    destinationAddress: string;
    createdAt: string;
    adminNotes: string | null;
}

export default function WithdrawalManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const withdrawalId = resolvedParams.id;
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();

    const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [stats, setStats] = useState({
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

    const { subscribe } = useRealtimeAdmin();

    const [txHash, setTxHash] = useState('');
    const [notes, setNotes] = useState('');

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'default' | 'destructive';
    }>({
        isOpen: false,
        title: '',
        description: '',
        action: () => { },
    });

    useEffect(() => {
        if (!authLoading) {
            if (!admin) {
                router.push('/admin/login');
            } else {
                fetchWithdrawalDetails();
                fetchStats();

                const unsubDeposit = subscribe('deposit:created', () => fetchStats());
                const unsubWithdrawal = subscribe('withdrawal:created', () => fetchStats());

                return () => {
                    unsubDeposit();
                    unsubWithdrawal();
                };
            }
        }
    }, [admin, authLoading, withdrawalId, subscribe]);

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

    const fetchWithdrawalDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`);
            if (response.ok) {
                const data = await response.json();
                setWithdrawal(data.withdrawal);
                setTxHash(data.withdrawal.txHash || '');
                setNotes(data.withdrawal.adminNotes || '');
            } else {
                toast.error('Failed to fetch withdrawal details');
            }
        } catch (error) {
            console.error('Error fetching withdrawal:', error);
            toast.error('Error loading withdrawal data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedText(null), 2000);
    };

    const handleUpdateStatus = (status: 'approved' | 'rejected') => {
        if (!withdrawal) return;

        const executeUpdate = async () => {
            try {
                setProcessing(true);
                const response = await fetch('/api/admin/withdrawals/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        withdrawalId: withdrawal.id,
                        status,
                        txHash: status === 'approved' ? txHash : undefined,
                        notes: notes
                    }),
                });

                if (response.ok) {
                    toast.success(`Withdrawal ${status} successfully`);
                    fetchStats(); // Update badges
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    router.back();
                } else {
                    const error = await response.json();
                    toast.error(error.error || 'Failed to update withdrawal');
                }
            } catch (error) {
                toast.error('Error processing request');
            } finally {
                setProcessing(false);
            }
        };

        if (status === 'approved' && !txHash) {
            setConfirmState({
                isOpen: true,
                title: 'No Transaction Hash!',
                description: 'You are approving this withdrawal without providing a transaction hash. Should the user be notified it was sent anyway?',
                variant: 'destructive',
                action: executeUpdate
            });
            return;
        }

        setConfirmState({
            isOpen: true,
            title: `${status.toUpperCase()} Withdrawal?`,
            description: `Are you sure you want to ${status} this withdrawal of $${withdrawal.usdtAmount.toFixed(2)} USDT?`,
            variant: status === 'rejected' ? 'destructive' : 'default',
            action: executeUpdate
        });
    };

    const isPending = withdrawal?.status === 'pending';

    return (
        <AdminLayout
            title={withdrawal ? `Process Withdrawal #${withdrawal.id.slice(-6)}` : 'Withdrawal Management'}
            subtitle={withdrawal ? "Review and process user withdrawal requests" : "Synchronizing withdrawal data..."}
            actions={
                <Button variant="outline" size="sm" onClick={fetchWithdrawalDetails}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            }
        >
            {loading && !withdrawal ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Fetching Withdrawal Details...</p>
                </div>
            ) : !withdrawal ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <ArrowUpCircle className="h-12 w-12 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900">Withdrawal Request Not Found</h2>
                    <p className="text-sm">The requested withdrawal ID could not be located in our database.</p>
                    <Button onClick={() => router.back()} variant="outline" className="mt-4">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Col: Summary & User */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <ArrowUpCircle className="h-4 w-4 text-orange-600" />
                                        Requested Amount
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <p className="text-3xl font-bold">
                                        {withdrawal.cryptoAmount} <span className="text-lg text-muted-foreground">{withdrawal.currency}</span>
                                    </p>
                                    <p className="text-sm font-medium">
                                        ≈ ${withdrawal.usdtAmount.toFixed(2)} USDT
                                    </p>
                                    <div className="pt-2 flex justify-between text-xs border-t mt-4">
                                        <span className="text-muted-foreground">Original Request:</span>
                                        <span className="font-semibold">${(withdrawal.usdtAmount + withdrawal.fee).toFixed(2)} USDT</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-orange-600">
                                        <span>Fee Deducted:</span>
                                        <span className="font-semibold">-${withdrawal.fee.toFixed(2)} USDT</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold pt-1">
                                        <span>Net to Send:</span>
                                        <span>{withdrawal.cryptoAmount} {withdrawal.currency}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        User Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-xs">User Display</Label>
                                        <p className="font-semibold text-sm">{withdrawal.userDisplay}</p>
                                        <p className="text-xs text-muted-foreground">UID: {withdrawal.uid}</p>
                                    </div>
                                    <div className="pt-2 border-t text-sm">
                                        <Label className="text-xs">Native Wallet</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-[10px] bg-slate-100 p-2 rounded flex-1 truncate">
                                                {withdrawal.walletAddress}
                                            </code>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <Label className="text-xs">Submission Date</Label>
                                        <div className="flex items-center gap-2 mt-1 text-sm">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {new Date(withdrawal.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Center/Right Col: Execution */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payout Details</CardTitle>
                                    <CardDescription>Send funds to the destination address specified by user</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-orange-800 font-bold uppercase tracking-tighter text-sm">
                                            <AlertTriangle className="h-4 w-4" />
                                            CRITICAL: Destination Address
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <code className="text-lg bg-orange-100 p-4 rounded-md flex-1 break-all border-2 border-orange-300 font-mono font-bold text-orange-900 leading-tight">
                                                {withdrawal.destinationAddress}
                                            </code>
                                            <Button
                                                size="lg"
                                                className="h-full px-6 bg-orange-700 hover:bg-orange-800 shadow-lg shrink-0"
                                                onClick={() => handleCopy(withdrawal.destinationAddress)}
                                            >
                                                <Copy className="h-5 w-5 mr-2" />
                                                Copy
                                            </Button>
                                        </div>
                                        <p className="text-xs text-orange-700 font-medium">
                                            Verify the network and address carefully before sending.
                                        </p>
                                    </div>

                                    {isPending && (
                                        <div className="space-y-6 pt-6 ">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold flex items-center gap-2">
                                                    <Send className="h-4 w-4 text-blue-600" />
                                                    Step 1: Process Send and Enter Tx Hash
                                                </Label>
                                                <Input
                                                    placeholder="Enter the transaction hash from your wallet..."
                                                    value={txHash}
                                                    onChange={(e) => setTxHash(e.target.value)}
                                                    className="font-mono text-xs p-4 h-12"
                                                />
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    Entering the Tx Hash helps the user track their withdrawal status.
                                                </p>
                                            </div>

                                            <div className="space-y-2 pt-4 border-t">
                                                <Label className="text-sm font-bold">Step 2: Add Internal Notes</Label>
                                                <Textarea
                                                    placeholder="Add any internal notes or rejection reason..."
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="h-24"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleUpdateStatus('rejected')}
                                                    disabled={processing}
                                                    className="h-12 border-red-200 text-red-600 hover:bg-red-50"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Reject Withdrawal
                                                </Button>
                                                <Button
                                                    onClick={() => handleUpdateStatus('approved')}
                                                    disabled={processing}
                                                    className="h-12 bg-green-600 hover:bg-green-700 shadow-lg"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Mark as Approved & Sent
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {!isPending && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="p-4 rounded-lg bg-slate-100 border flex flex-col items-center gap-2">
                                                <CheckCircle className={`h-8 w-8 ${withdrawal.status === 'approved' ? 'text-green-600' : 'text-red-600'}`} />
                                                <p className="font-bold">Withdrawal {withdrawal.status.toUpperCase()}</p>
                                            </div>
                                            {withdrawal.txHash && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold">Transaction Hash</Label>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[10px] bg-slate-100 p-3 rounded flex-1 break-all border">
                                                            {withdrawal.txHash}
                                                        </code>
                                                        <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                                                            <a href={`https://blockchair.com/search?q=${withdrawal.txHash}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                            {withdrawal.adminNotes && (
                                                <div className="p-3 bg-slate-50 border rounded text-xs italic">
                                                    <p className="font-bold not-italic mb-1">Admin Notes:</p>
                                                    {withdrawal.adminNotes}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}

            <AlertDialog open={confirmState.isOpen} onOpenChange={(open) => setConfirmState(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmState.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmState.action}
                            disabled={processing}
                            className={confirmState.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {processing ? 'Processing...' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
