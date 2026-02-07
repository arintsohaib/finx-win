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
    ChevronLeft, ArrowDownCircle, CheckCircle,
    XCircle, Copy, Check, Calendar, User,
    Wallet, Info, ExternalLink, RefreshCw, ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import Image from 'next/image';
import { ImageLightbox } from '@/components/ui/image-lightbox';

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
import { AdminLayout } from '@/components/admin/admin-layout';

interface Deposit {
    id: string;
    uid: string;
    userDisplay: string;
    userEmail: string | null;
    walletAddress: string;
    currency: string;
    cryptoAmount: number;
    usdtAmount: number;
    conversionRate: number;
    status: string;
    txHash: string | null;
    depositAddress: string;
    paymentScreenshot: string | null;
    createdAt: string;
    adminNotes: string | null;
}

export default function DepositManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const depositId = resolvedParams.id;
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();

    const [deposit, setDeposit] = useState<Deposit | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [stats, setStats] = useState({
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

    const { subscribe } = useRealtimeAdmin();

    // Adjustment State
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustedUsdt, setAdjustedUsdt] = useState('');
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
                fetchDepositDetails();
                fetchStats();

                const unsubDeposit = subscribe('deposit:created', () => fetchStats());
                const unsubWithdrawal = subscribe('withdrawal:created', () => fetchStats());

                return () => {
                    unsubDeposit();
                    unsubWithdrawal();
                };
            }
        }
    }, [admin, authLoading, depositId, subscribe]);

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

    const fetchDepositDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/deposits/${depositId}`);
            if (response.ok) {
                const data = await response.json();
                setDeposit(data.deposit);
                setAdjustedUsdt(data.deposit.usdtAmount.toString());
                setNotes(data.deposit.adminNotes || '');
            } else {
                toast.error('Failed to fetch deposit details');
            }
        } catch (error) {
            console.error('Error fetching deposit:', error);
            toast.error('Error loading deposit data');
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
        if (!deposit) return;

        setConfirmState({
            isOpen: true,
            title: `${status.toUpperCase()} Deposit?`,
            description: `Are you sure you want to ${status} this deposit of $${deposit.usdtAmount.toFixed(2)} USDT?`,
            variant: status === 'rejected' ? 'destructive' : 'default',
            action: async () => {
                try {
                    setProcessing(true);
                    const response = await fetch('/api/admin/deposits/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            depositId: deposit.id,
                            status,
                            notes: notes
                        }),
                    });

                    if (response.ok) {
                        toast.success(`Deposit ${status} successfully`);
                        fetchStats(); // Update badges
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        router.back();
                    } else {
                        const error = await response.json();
                        toast.error(error.error || 'Failed to update deposit');
                    }
                } catch (error) {
                    toast.error('Error processing request');
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const handleAdjustAndApprove = () => {
        if (!deposit) return;
        const amount = parseFloat(adjustedUsdt);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setConfirmState({
            isOpen: true,
            title: 'Adjust & Approve?',
            description: `Adjust amount to $${amount} USDT and approve this deposit?`,
            action: async () => {
                try {
                    setProcessing(true);
                    const response = await fetch('/api/admin/deposits/adjust-and-approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            depositId: deposit.id,
                            adjustedAmount: amount,
                            notes: notes
                        }),
                    });

                    if (response.ok) {
                        toast.success('Deposit adjusted and approved');
                        fetchStats(); // Update badges
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                        router.back();
                    } else {
                        const error = await response.json();
                        toast.error(error.error || 'Failed to adjust deposit');
                    }
                } catch (error) {
                    toast.error('Error processing request');
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    const isPending = deposit?.status === 'pending';

    return (
        <AdminLayout
            title={deposit ? `Process Deposit #${deposit.id.slice(-6)}` : 'Deposit Management'}
            subtitle={deposit ? "Verify and approve user deposit requests" : "Synchronizing deposit data..."}
            actions={
                <Button variant="outline" size="sm" onClick={fetchDepositDetails}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            }
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Verifying Transaction Data...</p>
                </div>
            ) : !deposit ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                    <ArrowDownCircle className="h-12 w-12 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900">Deposit Request Not Found</h2>
                    <p className="text-sm">The requested deposit ID could not be located in our database.</p>
                    <Button onClick={() => router.back()} variant="outline" className="mt-4">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {/* Left Col: Summary & User */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                    Deposit Amount
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-3xl font-bold">
                                    {deposit.cryptoAmount} <span className="text-lg text-muted-foreground">{deposit.currency}</span>
                                </p>
                                <p className="text-sm text-green-600 font-medium">
                                    ≈ ${deposit.usdtAmount.toFixed(2)} USDT
                                </p>
                                <p className="text-[10px] text-muted-foreground pt-2">
                                    Rate: 1 {deposit.currency} = {deposit.conversionRate.toFixed(2)} USDT
                                </p>
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
                                    <p className="font-semibold text-sm">{deposit.userDisplay}</p>
                                    <p className="text-xs text-muted-foreground">UID: {deposit.uid}</p>
                                </div>
                                <div className="pt-2 border-t">
                                    <Label className="text-xs">Address</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-[10px] bg-slate-100 p-2 rounded flex-1 truncate">
                                            {deposit.walletAddress}
                                        </code>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(deposit.walletAddress)}>
                                            {copiedText === deposit.walletAddress ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="pt-2 border-t">
                                    <Label className="text-xs">Submission Date</Label>
                                    <div className="flex items-center gap-2 mt-1 text-sm">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {new Date(deposit.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center/Right Col: Details & Verification */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transfer Verification</CardTitle>
                                <CardDescription>Verify the blockchain transaction and payment proof</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Transaction Hash</Label>
                                    {deposit.txHash ? (
                                        <div className="flex items-center gap-2">
                                            <code className="text-[10px] bg-slate-100 p-3 rounded flex-1 break-all border font-mono">
                                                {deposit.txHash}
                                            </code>
                                            <div className="flex flex-col gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(deposit.txHash!)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                                                    <a href={`https://blockchair.com/search?q=${deposit.txHash}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-red-50 text-red-600 rounded border border-red-100 text-sm flex items-center gap-2">
                                            <Info className="h-4 w-4" /> No transaction hash provided by user.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <Label className="text-xs font-bold">Payment Screenshot / Proof</Label>
                                    {deposit.paymentScreenshot ? (
                                        <div className="flex flex-col gap-2">
                                            <ImageLightbox
                                                src={`/api/admin/view-payment-proof/${deposit.paymentScreenshot.split('/').pop()}`}
                                                alt="Payment Proof"
                                                trigger={
                                                    <div className="relative w-full aspect-video rounded-lg border-2 border-muted overflow-hidden group cursor-zoom-in">
                                                        <Image
                                                            src={`/api/admin/view-payment-proof/${deposit.paymentScreenshot.split('/').pop()}`}
                                                            alt="Payment Proof"
                                                            fill
                                                            className="object-contain bg-slate-200"
                                                            unoptimized
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                                            <div className="bg-white/80 rounded-full p-3 shadow-lg scale-90 group-hover:scale-100 transition-transform opacity-0 group-hover:opacity-100">
                                                                <ZoomIn className="h-6 w-6 text-primary" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                            <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                                                <Info className="h-3 w-3" /> Click image to expand to full size
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-slate-50 text-muted-foreground">
                                            <ImageIcon className="h-10 w-10 opacity-20 mb-2" />
                                            <p className="text-sm font-medium">No payment screenshot available</p>
                                        </div>
                                    )}
                                </div>

                                {isPending && (
                                    <div className="space-y-4 pt-6 border-t">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="adjust-toggle"
                                                checked={isAdjusting}
                                                onChange={(e) => setIsAdjusting(e.target.checked)}
                                                className="rounded border-slate-300"
                                            />
                                            <Label htmlFor="adjust-toggle" className="text-sm font-semibold cursor-pointer">
                                                Need to adjust the USDT amount before approving?
                                            </Label>
                                        </div>

                                        {isAdjusting && (
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <Label className="text-blue-800">New USDT Amount</Label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                            <Input
                                                                type="number"
                                                                value={adjustedUsdt}
                                                                onChange={(e) => setAdjustedUsdt(e.target.value)}
                                                                className="pl-7 bg-white"
                                                            />
                                                        </div>
                                                        <Badge variant="outline" className="bg-blue-100 border-blue-300">USDT</Badge>
                                                    </div>
                                                    <p className="text-[10px] text-blue-600 mt-1">
                                                        Original: ${deposit.usdtAmount.toFixed(2)} | Diff: ${(parseFloat(adjustedUsdt) - deposit.usdtAmount).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider">Internal Notes (Sent to user on rejection)</Label>
                                            <Textarea
                                                placeholder="Add processing notes or rejection reason..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="h-24"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleUpdateStatus('rejected')}
                                                disabled={processing}
                                                className="h-12"
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Reject Deposit
                                            </Button>

                                            {isAdjusting ? (
                                                <Button
                                                    onClick={handleAdjustAndApprove}
                                                    disabled={processing}
                                                    className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Adjust & Approve
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => handleUpdateStatus('approved')}
                                                    disabled={processing}
                                                    className="h-12 bg-green-600 hover:bg-green-700 shadow-md"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Quick Approve
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!isPending && (
                                    <div className="p-4 rounded-lg bg-slate-100 border text-center space-y-2">
                                        <p className="text-sm font-semibold text-muted-foreground">Request already processed</p>
                                        {deposit.adminNotes && (
                                            <p className="text-xs italic text-muted-foreground">Note: {deposit.adminNotes}</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
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

function ImageIcon(props: any) {
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
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    );
}
