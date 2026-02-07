
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Clock, TrendingUp, ArrowUp, ArrowDown, ArrowLeft, Loader2, Info } from 'lucide-react';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRealtimeUser } from '@/hooks/use-realtime-user';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GlobalSetting {
    deliveryTime: string;
    profitLevel: number;
    minUsdt: number;
}

interface AssetInfo {
    assetSymbol: string;
    assetName: string;
    assetType: string;
    isEnabled: boolean;
}

interface TradePageProps {
    asset: string;
}

export function TradePage({ asset }: TradePageProps) {
    const router = useRouter();
    const { prices, createTrade, fetchPrices } = useTradingStore();
    const { user, refreshBalances } = useAuthStore();
    const { subscribe } = useRealtimeUser();

    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [duration, setDuration] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentProfitLevel, setCurrentProfitLevel] = useState<number>(0);
    const [minTradeAmount, setMinTradeAmount] = useState<number>(10);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    useEffect(() => {
        const foundAsset = prices.find((p: any) => p.symbol === asset.toUpperCase());
        setSelectedAsset(foundAsset || { symbol: asset.toUpperCase(), name: asset.toUpperCase() });
    }, [asset, prices]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!asset) return;

            setLoading(true);
            try {
                await refreshBalances();

                const assetResponse = await fetch(`/api/trading/asset-check/${asset.toUpperCase()}`);
                if (!assetResponse.ok) {
                    toast.error('Trading Not Available', {
                        description: 'This asset is not available for trading at the moment.'
                    });
                    router.back();
                    return;
                }
                const assetData = await assetResponse.json();
                setAssetInfo(assetData.asset);

                const globalResponse = await fetch('/api/trading/global-settings');
                if (globalResponse.ok) {
                    const globalData = await globalResponse.json();
                    setGlobalSettings(globalData.settings || []);

                    if (globalData.settings && globalData.settings.length > 0) {
                        setDuration(globalData.settings[0].deliveryTime);
                        setCurrentProfitLevel(globalData.settings[0].profitLevel);
                        setMinTradeAmount(globalData.settings[0].minUsdt);
                        setAmount(globalData.settings[0].minUsdt.toString());
                    }
                } else {
                    toast.error('Failed to Load Settings');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                toast.error('Failed to Load Settings');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
        fetchPrices();
    }, [asset, fetchPrices]);

    useEffect(() => {
        if (globalSettings.length > 0 && duration) {
            const setting = globalSettings.find((s: any) => s.deliveryTime === duration);
            if (setting) {
                setCurrentProfitLevel(setting.profitLevel);
                setMinTradeAmount(setting.minUsdt);
                setAmount(setting.minUsdt.toString());
            }
        }
    }, [duration, globalSettings]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'WebSocket' in window) {
            const unsubscribe = subscribe('balance:updated', () => {
                refreshBalances();
            });
            return () => unsubscribe();
        }
    }, [subscribe, refreshBalances]);

    const handleSubmit = async () => {
        if (!selectedAsset || !assetInfo) return;

        if (!duration) {
            toast.error('Please select a delivery time');
            return;
        }

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue < minTradeAmount) {
            toast.error(`Minimum trade amount is ${minTradeAmount} USDT`);
            return;
        }

        const usdtBalance = parseFloat(user?.balances?.USDT || '0');
        if (usdtBalance < amountValue) {
            toast.error('Insufficient USDT Balance');
            return;
        }

        setIsSubmitting(true);

        try {
            const tradeData = {
                asset: selectedAsset.symbol,
                side,
                amountUsd: amountValue,
                duration,
                profitMultiplier: `${currentProfitLevel}%`
            };

            const success = await createTrade(tradeData);

            if (success) {
                await Promise.all([refreshBalances(), fetchPrices()]);
                toast.success('Trade placed successfully!');
                router.push('/profit-statistics');
            } else {
                toast.error('Failed to Place Trade');
            }
        } catch (error) {
            console.error('Trade submission error:', error);
            toast.error('Failed to Place Trade');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const usdtBalance = parseFloat(user?.balances?.USDT || '0');
    const amountValue = parseFloat(amount) || 0;

    if (loading || !assetInfo || globalSettings.length === 0) {
        return (
            <div className="min-h-screen gradient-subtle flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-subtle">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Navigation Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="gradientGhost"
                        size="icon"
                        onClick={handleBack}
                        className="h-12 w-12 rounded-2xl glass-card border-white/5 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-black/20 flex items-center justify-center bg-primary/10">
                            {selectedAsset?.image ? (
                                <img
                                    src={selectedAsset.image}
                                    alt={assetInfo.assetName}
                                    className="w-10 h-10 object-contain relative z-10"
                                    onError={(e: any) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement?.querySelector('.fallback-initials')?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <span className={cn(
                                "text-2xl font-black text-primary relative z-10 fallback-initials",
                                selectedAsset?.image && "hidden"
                            )}>
                                {selectedAsset?.symbol?.slice(0, 2)}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">{assetInfo.assetName}</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                                Trading Pair: {selectedAsset.symbol}/USDT
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Main Action Section */}
                    <Card className="glass-card border-primary/20 overflow-hidden shadow-2xl">
                        <CardContent className="p-6 sm:p-8 space-y-8">
                            {/* Order Type Toggle */}
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setSide('buy')}
                                    className={cn(
                                        "flex-1 h-16 rounded-2xl text-lg font-black uppercase tracking-widest transition-all active:scale-95 border-0",
                                        side === 'buy'
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30"
                                            : "bg-secondary/30 text-muted-foreground grayscale opacity-60"
                                    )}
                                >
                                    <ArrowUp className="h-6 w-6 mr-2" />
                                    Long
                                </Button>
                                <Button
                                    onClick={() => setSide('sell')}
                                    className={cn(
                                        "flex-1 h-16 rounded-2xl text-lg font-black uppercase tracking-widest transition-all active:scale-95 border-0",
                                        side === 'sell'
                                            ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/30"
                                            : "bg-secondary/30 text-muted-foreground grayscale opacity-60"
                                    )}
                                >
                                    <ArrowDown className="h-6 w-6 mr-2" />
                                    Short
                                </Button>
                            </div>

                            {/* Trade Parameters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Duration Select */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">Delivery Time</Label>
                                    <Select value={duration} onValueChange={setDuration}>
                                        <SelectTrigger className="h-14 rounded-2xl border-white/5 bg-secondary/30 text-lg font-black tracking-tight focus:ring-primary/20">
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {globalSettings.map((setting) => (
                                                <SelectItem key={setting.deliveryTime} value={setting.deliveryTime}>
                                                    {setting.deliveryTime}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Profit Level Display */}
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col justify-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Estimated Profit</p>
                                    <p className="text-3xl font-black tracking-tighter text-primary">{currentProfitLevel}%</p>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Purchase Price (USDT)</Label>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                                        Min: {minTradeAmount} USDT
                                    </span>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="h-20 text-4xl font-black tracking-tighter rounded-2xl border-white/5 bg-secondary/30 pr-24 focus:ring-primary/20"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground opacity-40">USDT</div>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-muted-foreground opacity-60 uppercase tracking-widest">Available Capital</span>
                                    <span className={cn(usdtBalance < amountValue ? "text-rose-500" : "text-foreground")}>
                                        {usdtBalance.toFixed(2)} USDT
                                    </span>
                                </div>
                            </div>

                            {/* Capital Check Warning */}
                            {usdtBalance < amountValue && (
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-center">
                                    <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Insufficient Capital</p>
                                        <p className="text-[10px] text-muted-foreground">You need more USDT to open this position.</p>
                                    </div>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => router.push('/wallet')}
                                        className="text-amber-500 font-black h-auto p-0 uppercase text-[10px]"
                                    >
                                        Deposit →
                                    </Button>
                                </div>
                            )}

                            {/* Order Summary */}
                            {amountValue > 0 && (
                                <Card className="glass-morphism border-white/5 shadow-inner">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">Expected Return</span>
                                            <span className="text-lg font-black text-emerald-500">
                                                +${(amountValue * (currentProfitLevel / 100)).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">Settlement Period</span>
                                            <span className="text-xs font-black uppercase text-foreground">{duration}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Execution Button */}
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !duration || amountValue < minTradeAmount || usdtBalance < amountValue}
                                className={cn(
                                    "w-full h-20 rounded-2xl font-black uppercase tracking-[0.3em] text-lg shadow-2xl transition-all active:scale-95",
                                    side === 'buy'
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/40"
                                        : "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/40"
                                )}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="h-6 w-6 mr-3 animate-spin" /> Verifying...</>
                                ) : (
                                    <>Execute {side === 'buy' ? 'Long' : 'Short'}</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Guidelines */}
                    <div className="p-6 text-center space-y-4 opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"> Trading Guidelines </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Express execution is instant. Settlement results will be determined at the end of the selected delivery time.
                            Ensure your network connection is stable during execution.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
