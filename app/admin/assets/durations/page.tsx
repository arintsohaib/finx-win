'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import {
    Clock, Plus, Trash2, RefreshCw,
    TrendingUp, Edit2, X, Check,
    ChevronLeft, LayoutGrid, Globe, AlertTriangle, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';
import { AdminLayout } from '@/components/admin/admin-layout';
import { Badge } from '@/components/ui/badge';

interface GlobalSetting {
    id: string;
    deliveryTime: string;
    profitLevel: number;
    minUsdt: number;
}

interface EditingRow {
    id: string;
    deliveryTime: string;
    profitLevel: string;
    minUsdt: string;
}

const DURATION_UNITS = [
    { value: 's', label: 'Seconds' },
    { value: 'm', label: 'Minutes' },
    { value: 'h', label: 'Hours' },
    { value: 'd', label: 'Days' },
    { value: 'y', label: 'Years' },
] as const;

export default function AssetDurationsPage() {
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();
    const [settings, setSettings] = useState<GlobalSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeTrades: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

    const { subscribe } = useRealtimeAdmin();

    // New row form state
    const [newDurationValue, setNewDurationValue] = useState('30');
    const [newDurationUnit, setNewDurationUnit] = useState('s');
    const [newProfit, setNewProfit] = useState('10');
    const [newMinBalance, setNewMinBalance] = useState('10');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!admin) {
                router.push('/admin/login');
            } else {
                fetchSettings();
            }
        }
    }, [admin, authLoading, router]);


    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/trading/global-settings');
            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings || []);
            } else {
                toast.error('Failed to load settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNewDuration = async () => {
        if (!newDurationValue || !newDurationUnit || !newProfit || !newMinBalance) {
            toast.error('All fields are required');
            return;
        }

        const durationVal = parseInt(newDurationValue);
        const profit = parseFloat(newProfit);
        const minBalance = parseFloat(newMinBalance);

        if (isNaN(durationVal) || durationVal <= 0) {
            toast.error('Duration value must be greater than 0');
            return;
        }

        if (isNaN(profit) || profit <= 0 || profit > 1000) {
            toast.error('Profit level must be between 0.01 and 1000');
            return;
        }

        if (isNaN(minBalance) || minBalance <= 0) {
            toast.error('Minimum balance must be greater than 0');
            return;
        }

        try {
            setSaving(true);
            const response = await fetch('/api/admin/assets-ctrl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    durationValue: durationVal,
                    durationUnit: newDurationUnit,
                    profitLevel: profit,
                    minUsdt: minBalance,
                }),
            });

            if (response.ok) {
                toast.success('Duration added successfully');
                fetchSettings();
                setShowAddForm(false);
                setNewDurationValue('30');
                setNewDurationUnit('s');
                setNewProfit('10');
                setNewMinBalance('10');
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to add duration');
            }
        } catch (error) {
            console.error('Error adding duration:', error);
            toast.error('Failed to add duration');
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (setting: GlobalSetting) => {
        setEditingRow({
            id: setting.id,
            deliveryTime: setting.deliveryTime,
            profitLevel: setting.profitLevel.toString(),
            minUsdt: setting.minUsdt.toString(),
        });
    };

    const handleCancelEdit = () => {
        setEditingRow(null);
    };

    const handleSaveEdit = async () => {
        if (!editingRow) return;

        const profit = parseFloat(editingRow.profitLevel);
        const minBalance = parseFloat(editingRow.minUsdt);

        if (isNaN(profit) || profit <= 0 || profit > 1000) {
            toast.error('Profit level must be between 0.01 and 1000');
            return;
        }

        if (isNaN(minBalance) || minBalance <= 0) {
            toast.error('Minimum balance must be greater than 0');
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(`/api/admin/assets-ctrl/${editingRow.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profitLevel: profit,
                    minUsdt: minBalance,
                }),
            });

            if (response.ok) {
                toast.success('Settings updated successfully');
                fetchSettings();
                setEditingRow(null);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDuration = async (id: string) => {
        try {
            setSaving(true);
            const response = await fetch(`/api/admin/assets-ctrl/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Duration deleted successfully');
                fetchSettings();
                setShowDeleteDialog(false);
                setDeleteId(null);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to delete duration');
            }
        } catch (error) {
            console.error('Error deleting duration:', error);
            toast.error('Failed to delete duration');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        try {
            setSaving(true);
            const response = await fetch('/api/admin/assets-ctrl/reset', {
                method: 'POST',
            });

            if (response.ok) {
                toast.success('Settings reset to defaults successfully');
                fetchSettings();
                setShowResetDialog(false);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to reset settings');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            toast.error('Failed to reset settings');
        } finally {
            setSaving(false);
        }
    };

    const getDurationLabel = (duration: string): string => {
        const match = duration.match(/^(\d+)([smhdy])$/i);
        if (!match) return duration;

        const value = match[1];
        const unit = match[2].toLowerCase();

        const unitLabels: Record<string, string> = {
            's': value === '1' ? 'Second' : 'Seconds',
            'm': value === '1' ? 'Minute' : 'Minutes',
            'h': value === '1' ? 'Hour' : 'Hours',
            'd': value === '1' ? 'Day' : 'Days',
            'y': value === '1' ? 'Year' : 'Years',
        };

        return `${value} ${unitLabels[unit] || unit}`;
    };


    return (
        <AdminLayout
            title="Delivery Durations"
            subtitle="Configure market trade durations and profit levels"
            actions={
                <Button variant="outline" size="sm" onClick={fetchSettings} className="h-9 w-9 p-0 border-slate-200">
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            }
        >
            <div className="space-y-6">
                <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 border-none shadow-lg text-white">
                    <CardHeader className="pb-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-xl">Market Trading Rules</CardTitle>
                                </div>
                                <CardDescription className="text-indigo-100/80">
                                    Define global profit thresholds and balance requirements for active trading durations.
                                </CardDescription>
                            </div>
                            <Button
                                onClick={() => setShowResetDialog(true)}
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                                disabled={saving}
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", saving && "animate-spin")} />
                                Reset to Core Defaults
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="pb-4 border-b bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Configured Durations</CardTitle>
                                <CardDescription>Operational settings for all connected market pairs</CardDescription>
                            </div>
                            <Button
                                onClick={() => setShowAddForm(!showAddForm)}
                                size="sm"
                                variant={showAddForm ? "outline" : "default"}
                                className={cn("h-9", !showAddForm && "bg-slate-900 hover:bg-slate-800 text-white")}
                            >
                                {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                {showAddForm ? 'Cancel Entry' : 'New Duration'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {showAddForm && (
                            <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Duration & Unit</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={newDurationValue}
                                                onChange={(e) => setNewDurationValue(e.target.value)}
                                                className="h-10 border-slate-200"
                                                placeholder="30"
                                            />
                                            <Select value={newDurationUnit} onValueChange={setNewDurationUnit}>
                                                <SelectTrigger className="w-[130px] h-10 border-slate-200 bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DURATION_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Profit Level (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={newProfit}
                                                onChange={(e) => setNewProfit(e.target.value)}
                                                className="h-10 pl-3 border-slate-200"
                                                placeholder="10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Min Stake (USDT)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={newMinBalance}
                                                onChange={(e) => setNewMinBalance(e.target.value)}
                                                className="h-10 pl-3 border-slate-200"
                                                placeholder="10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleAddNewDuration} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-6">
                                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Transaction Rule
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="px-6 h-12 text-xs font-bold text-slate-500 uppercase">Trade Duration</TableHead>
                                        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase">Reward Multiplier</TableHead>
                                        <TableHead className="h-12 text-xs font-bold text-slate-500 uppercase">Minimum Investment</TableHead>
                                        <TableHead className="text-right px-6 h-12 text-xs font-bold text-slate-500 uppercase">Configurations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">No durations configured</TableCell>
                                        </TableRow>
                                    ) : (
                                        settings.map((setting) => {
                                            const isEditing = editingRow?.id === setting.id;
                                            return (
                                                <TableRow key={setting.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                                    <TableCell className="px-6 font-bold text-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                                <Clock className="h-4 w-4 text-slate-500" />
                                                            </div>
                                                            {getDurationLabel(setting.deliveryTime)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <div className="relative w-32">
                                                                <Input
                                                                    type="number"
                                                                    value={editingRow.profitLevel}
                                                                    onChange={(e) => setEditingRow({ ...editingRow, profitLevel: e.target.value })}
                                                                    className="h-9 border-slate-200 pr-8"
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 font-bold px-2 py-0.5">
                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                                +{setting.profitLevel.toFixed(1)}%
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <div className="relative w-32">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                                                                <Input
                                                                    type="number"
                                                                    value={editingRow.minUsdt}
                                                                    onChange={(e) => setEditingRow({ ...editingRow, minUsdt: e.target.value })}
                                                                    className="h-9 border-slate-200 pl-5"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-sm">
                                                                {setting.minUsdt.toFixed(2)} USDT
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex justify-end gap-1.5">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                                                                        <Check className="h-4 w-4 mr-1.5" /> Save
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 text-slate-500">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => handleStartEdit(setting)}>
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setDeleteId(setting.id); setShowDeleteDialog(true); }}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-sm text-blue-800 space-y-1">
                        <p className="font-extrabold text-blue-900 italic">Enterprise Compliance Warning</p>
                        <p className="leading-relaxed">Profit levels and minimum balance requirements defined here will apply to all market assets globally. Traders must meet the minimum balance within their <span className="font-bold">available balance</span> to select a duration.</p>
                    </div>
                </div>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Duration Option?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this delivery duration? This will affect all trading assets immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && handleDeleteDuration(deleteId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset to Default Durations?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove all custom delivery options and restore system defaults (30s, 60s, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetToDefaults}>Confirm Reset</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
