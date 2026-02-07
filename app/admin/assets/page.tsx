'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    RefreshCw, Eye, EyeOff, Plus, Trash2,
    Edit2, RotateCcw, Search, X, ChevronLeft, LayoutGrid, Clock, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';
import { AdminLayout } from '@/components/admin/admin-layout';
import { cn } from '@/lib/utils';

interface TradingAsset {
    id: string;
    assetSymbol: string;
    assetType: string;
    assetName: string;
    isEnabled: boolean;
    sortOrder: number | null;
}

interface NewAssetForm {
    symbol: string;
    name: string;
    type: string;
    isEnabled: boolean;
    sortOrder: string;
}

// Sub-components
interface AssetGroupSectionProps {
    title: string;
    color: string;
    assets: TradingAsset[];
    updating: string | null;
    onToggle: (asset: TradingAsset) => void;
    onEdit: (asset: TradingAsset) => void;
    onDelete: (asset: TradingAsset) => void;
    getAssetTypeLabel: (type: string) => { label: string; color: string };
}

function AssetGroupSection({
    title, color, assets, updating, onToggle, onEdit, onDelete, getAssetTypeLabel
}: AssetGroupSectionProps) {
    return (
        <div className="p-4 md:p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${color}`}></div>
                {title} ({assets.length})
            </h3>
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[120px]">Symbol</TableHead>
                            <TableHead>Asset Name</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[80px] text-center">Sort</TableHead>
                            <TableHead className="w-[120px] text-center">Status</TableHead>
                            <TableHead className="w-[200px] text-right px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assets.map((asset) => (
                            <TableRow key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-mono font-bold text-slate-700">{asset.assetSymbol}</TableCell>
                                <TableCell className="font-medium">{asset.assetName}</TableCell>
                                <TableCell>
                                    <Badge className={`${getAssetTypeLabel(asset.assetType).color} hover:${getAssetTypeLabel(asset.assetType).color}`}>
                                        {getAssetTypeLabel(asset.assetType).label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground">
                                    {asset.sortOrder ?? '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        {asset.isEnabled ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-600 gap-1">
                                                <Eye className="h-3 w-3" /> Enabled
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <EyeOff className="h-3 w-3" /> Disabled
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex justify-end items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                                onClick={() => onEdit(asset)}
                                                disabled={!!updating}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-destructive"
                                                onClick={() => onDelete(asset)}
                                                disabled={!!updating}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                                        <Switch
                                            checked={asset.isEnabled}
                                            onCheckedChange={() => onToggle(asset)}
                                            disabled={updating === asset.id}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default function AssetManagementPage() {
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission } = useAdminAuth();
    const { subscribe } = useRealtimeAdmin();

    const [assets, setAssets] = useState<TradingAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'crypto' | 'forex' | 'metal' | 'stock'>('all');

    // Add Asset Dialog
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newAsset, setNewAsset] = useState<NewAssetForm>({
        symbol: '',
        name: '',
        type: 'CRYPTO',
        isEnabled: true,
        sortOrder: '',
    });

    // Edit Asset Dialog
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingAsset, setEditingAsset] = useState<TradingAsset | null>(null);
    const [editForm, setEditForm] = useState({ name: '', sortOrder: '' });

    // Delete Asset Dialog
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteAsset, setDeleteAsset] = useState<TradingAsset | null>(null);

    // Reset Dialog
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);

    useEffect(() => {
        if (!authLoading && admin) {
            fetchAssets();
        }
    }, [admin, authLoading]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/asset-management');
            if (response.ok) {
                const data = await response.json();
                setAssets(data.assets || []);
            } else {
                toast.error('Failed to load assets');
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
            toast.error('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEnabled = async (asset: TradingAsset) => {
        try {
            setUpdating(asset.id);
            const response = await fetch('/api/admin/asset-management', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: asset.id,
                    isEnabled: !asset.isEnabled,
                }),
            });

            if (response.ok) {
                toast.success(`${asset.assetSymbol} ${!asset.isEnabled ? 'enabled' : 'disabled'}`);
                fetchAssets();
            } else {
                toast.error('Failed to update asset');
            }
        } catch (error) {
            console.error('Error updating asset:', error);
            toast.error('Failed to update asset');
        } finally {
            setUpdating(null);
        }
    };

    const handleAddAsset = async () => {
        if (!newAsset.symbol || !newAsset.name || !newAsset.type) {
            toast.error('Symbol, name, and type are required');
            return;
        }

        try {
            setUpdating('add');
            const response = await fetch('/api/admin/asset-management/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: newAsset.symbol.toUpperCase(),
                    name: newAsset.name,
                    type: newAsset.type,
                    isEnabled: newAsset.isEnabled,
                    sortOrder: newAsset.sortOrder ? parseInt(newAsset.sortOrder) : null,
                }),
            });

            if (response.ok) {
                toast.success(`Asset ${newAsset.symbol} added`);
                setShowAddDialog(false);
                setNewAsset({ symbol: '', name: '', type: 'CRYPTO', isEnabled: true, sortOrder: '' });
                fetchAssets();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to add asset');
            }
        } catch (error) {
            console.error('Error adding asset:', error);
            toast.error('Failed to add asset');
        } finally {
            setUpdating(null);
        }
    };

    const handleEditAsset = async () => {
        if (!editingAsset) return;

        try {
            setUpdating(editingAsset.id);
            const response = await fetch(`/api/admin/asset-management/${editingAsset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    sortOrder: editForm.sortOrder ? parseInt(editForm.sortOrder) : null,
                }),
            });

            if (response.ok) {
                toast.success(`Asset ${editingAsset.assetSymbol} updated`);
                setShowEditDialog(false);
                setEditingAsset(null);
                fetchAssets();
            } else {
                toast.error('Failed to update asset');
            }
        } catch (error) {
            console.error('Error updating asset:', error);
            toast.error('Failed to update asset');
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteAsset = async () => {
        if (!deleteAsset) return;

        try {
            setUpdating(deleteAsset.id);
            const response = await fetch(`/api/admin/asset-management/${deleteAsset.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success(`Asset ${deleteAsset.assetSymbol} deleted`);
                setShowDeleteDialog(false);
                setDeleteAsset(null);
                fetchAssets();
            } else {
                toast.error('Failed to delete asset');
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            toast.error('Failed to delete asset');
        } finally {
            setUpdating(null);
        }
    };

    const handleResetToDefaults = async () => {
        if (!resetConfirm) return;

        try {
            setUpdating('reset');
            const response = await fetch('/api/admin/asset-management/reset', {
                method: 'POST',
            });

            if (response.ok) {
                toast.success('Assets reset to defaults');
                setShowResetDialog(false);
                setResetConfirm(false);
                fetchAssets();
            } else {
                toast.error('Failed to reset assets');
            }
        } catch (error) {
            console.error('Error resetting assets:', error);
            toast.error('Failed to reset assets');
        } finally {
            setUpdating(null);
        }
    };

    const openEditDialog = (asset: TradingAsset) => {
        setEditingAsset(asset);
        setEditForm({ name: asset.assetName, sortOrder: asset.sortOrder?.toString() || '' });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (asset: TradingAsset) => {
        setDeleteAsset(asset);
        setShowDeleteDialog(true);
    };

    const getAssetTypeLabel = (type: string) => {
        switch (type.toUpperCase()) {
            case 'CRYPTO': return { label: 'Crypto', color: 'bg-blue-500' };
            case 'FOREX': return { label: 'Forex', color: 'bg-green-500' };
            case 'PRECIOUS_METAL': return { label: 'Metal', color: 'bg-yellow-600' };
            case 'STOCK': return { label: 'Stock', color: 'bg-purple-500' };
            default: return { label: type, color: 'bg-gray-500' };
        }
    };

    const filteredAssets = assets.filter((asset: TradingAsset) => {
        if (filterType !== 'all') {
            if (filterType === 'crypto' && asset.assetType !== 'CRYPTO') return false;
            if (filterType === 'forex' && asset.assetType !== 'FOREX') return false;
            if (filterType === 'metal' && asset.assetType !== 'PRECIOUS_METAL') return false;
            if (filterType === 'stock' && asset.assetType !== 'STOCK') return false;
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return asset.assetSymbol.toLowerCase().includes(query) || asset.assetName.toLowerCase().includes(query);
        }
        return true;
    });

    const groupedAssets = {
        crypto: filteredAssets.filter((a: TradingAsset) => a.assetType === 'CRYPTO'),
        forex: filteredAssets.filter((a: TradingAsset) => a.assetType === 'FOREX'),
        metals: filteredAssets.filter((a: TradingAsset) => a.assetType === 'PRECIOUS_METAL'),
        stocks: filteredAssets.filter((a: TradingAsset) => a.assetType === 'STOCK'),
    };


    return (
        <AdminLayout
            title="Market Asset Portfolio"
            subtitle="Manage global trading symbols and operational availability"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/assets/durations')} className="hidden md:flex">
                        <Clock className="h-4 w-4 mr-2" /> Durations
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/assets/trade-control')} className="hidden md:flex">
                        <Globe className="h-4 w-4 mr-2" /> Control
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchAssets} className="h-9 w-9 p-0">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            }
        >

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card><CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                        <p className="text-2xl font-bold">{assets.length}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Enabled</p>
                        <p className="text-2xl font-bold text-green-600">{assets.filter((a: TradingAsset) => a.isEnabled).length}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Disabled</p>
                        <p className="text-2xl font-bold text-slate-400">{assets.filter((a: TradingAsset) => !a.isEnabled).length}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-6 flex flex-col justify-center">
                        <div className="flex gap-2">
                            <Button onClick={() => setShowAddDialog(true)} size="sm" className="flex-1">
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                            <Button onClick={() => setShowResetDialog(true)} size="sm" variant="outline" className="flex-1">
                                <RotateCcw className="h-4 w-4 mr-2" /> Reset
                            </Button>
                        </div>
                    </CardContent></Card>
                </div>

                <Card>
                    <CardHeader className="pb-3 border-b">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search symbols..." value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} className="pl-9" />
                                {searchQuery && (
                                    <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery('')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(['all', 'crypto', 'forex', 'metal', 'stock'] as const).map(type => (
                                    <Button key={type} variant={filterType === type ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(type)}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredAssets.length === 0 && !loading ? (
                            <div className="text-center py-20">
                                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No assets found matching your criteria</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {groupedAssets.crypto.length > 0 && <AssetGroupSection title="Crypto" color="bg-blue-500" assets={groupedAssets.crypto} {...{ updating, onToggle: handleToggleEnabled, onEdit: openEditDialog, onDelete: openDeleteDialog, getAssetTypeLabel }} />}
                                {groupedAssets.forex.length > 0 && <AssetGroupSection title="Forex" color="bg-green-500" assets={groupedAssets.forex} {...{ updating, onToggle: handleToggleEnabled, onEdit: openEditDialog, onDelete: openDeleteDialog, getAssetTypeLabel }} />}
                                {groupedAssets.metals.length > 0 && <AssetGroupSection title="Metals" color="bg-yellow-600" assets={groupedAssets.metals} {...{ updating, onToggle: handleToggleEnabled, onEdit: openEditDialog, onDelete: openDeleteDialog, getAssetTypeLabel }} />}
                                {groupedAssets.stocks.length > 0 && <AssetGroupSection title="Stocks" color="bg-purple-500" assets={groupedAssets.stocks} {...{ updating, onToggle: handleToggleEnabled, onEdit: openEditDialog, onDelete: openDeleteDialog, getAssetTypeLabel }} />}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Symbol</Label><Input placeholder="BTC" value={newAsset.symbol} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAsset({ ...newAsset, symbol: e.target.value.toUpperCase() })} /></div>
                        <div className="space-y-2"><Label>Name</Label><Input placeholder="Bitcoin" value={newAsset.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAsset({ ...newAsset, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Type</Label>
                            <Select value={newAsset.type} onValueChange={(v: string) => setNewAsset({ ...newAsset, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                                <SelectItem value="CRYPTO">Crypto</SelectItem><SelectItem value="FOREX">Forex</SelectItem><SelectItem value="PRECIOUS_METAL">Metal</SelectItem><SelectItem value="STOCK">Stock</SelectItem>
                            </SelectContent></Select>
                        </div>
                        <div className="flex items-center space-x-2"><Switch checked={newAsset.isEnabled} onCheckedChange={(v: boolean) => setNewAsset({ ...newAsset, isEnabled: v })} /><Label>Enabled</Label></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button><Button onClick={handleAddAsset} disabled={!!updating}>Add</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit {editingAsset?.assetSymbol}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={editForm.sortOrder} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, sortOrder: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button><Button onClick={handleEditAsset} disabled={!!updating}>Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete {deleteAsset?.assetSymbol}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Reset to Defaults?</AlertDialogTitle><AlertDialogDescription>This will delete all custom assets.</AlertDialogDescription></AlertDialogHeader>
                    <div className="flex items-center space-x-2 py-4"><input type="checkbox" id="conf" checked={resetConfirm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetConfirm(e.target.checked)} /><Label htmlFor="conf">I Understand</Label></div>
                    <AlertDialogFooter><AlertDialogCancel onClick={() => setResetConfirm(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetToDefaults} disabled={!resetConfirm} className="bg-destructive text-white hover:bg-destructive/90">Reset</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
