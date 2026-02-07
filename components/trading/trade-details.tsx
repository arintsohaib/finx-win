
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Info, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { useTradingStore } from '@/lib/stores/trading-store';

interface TradeDetailsProps {
    tradeId: string;
}

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const difference = expiry - now;

            if (difference > 0) {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                if (hours > 0) {
                    setTimeLeft(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
                } else {
                    setTimeLeft(`${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
                }
            } else {
                setTimeLeft('Expired');
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span className="font-mono font-black">{timeLeft}</span>;
};

export function TradeDetails({ tradeId }: TradeDetailsProps) {
    const router = useRouter();
    const [trade, setTrade] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { prices, fetchPrices } = useTradingStore();

    useEffect(() => {
        const fetchTrade = async () => {
            try {
                const response = await fetch(`/api/trades/${tradeId}`);
                const data = await response.json();
                if (data.success) {
                    setTrade(data.trade);
                }
            } catch (error) {
                console.error('Fetch trade error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrade();
        fetchPrices();
    }, [tradeId, fetchPrices]);

    if (loading) {
        return (
            <div className="min-h-screen gradient-subtle flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="min-h-screen gradient-subtle flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-black mb-4">Trade Not Found</h2>
                <Button onClick={() => router.push('/profit-statistics')}>Go Back</Button>
            </div>
        );
    }

    const isRunning = trade.status === 'active';
    const entryPrice = parseFloat(trade.entryPrice || '0');
    const exitPrice = parseFloat(trade.exitPrice || '0');
    const amount = parseFloat(trade.amountUsd || '0');
    const pnl = parseFloat(trade.pnl || '0');
    const isProfit = pnl >= 0;

    return (
        <div className="min-h-screen gradient-subtle">
            <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="gradientGhost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-12 w-12 rounded-2xl glass-card border-white/5 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">Trade Settlement</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                            {trade.asset}/USDT • {isRunning ? 'In Progress' : 'Completed'}
                        </p>
                    </div>
                    <div className={cn(
                        "px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border shadow-sm",
                        isRunning ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                        {trade.status}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Main Status Card */}
                    <Card className="glass-card border-primary/10 overflow-hidden shadow-2xl">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full animate-pulse" />
                                    {(() => {
                                        const assetPrice = prices.find((p: any) => p.symbol === trade.asset.toUpperCase());
                                        const imageUrl = assetPrice?.image || SUPPORTED_CRYPTOS[trade.asset.toUpperCase()]?.logoUrl;

                                        if (imageUrl) {
                                            return (
                                                <img
                                                    src={imageUrl}
                                                    alt={trade.asset}
                                                    className="w-12 h-12 object-contain relative z-10"
                                                    onError={(e: any) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.parentElement?.querySelector('.fallback-initials')?.classList.remove('hidden');
                                                    }}
                                                />
                                            );
                                        }
                                        return null;
                                    })()}
                                    <span className={cn(
                                        "text-3xl font-black text-primary relative z-10 fallback-initials",
                                        (prices.find((p: any) => p.symbol === trade.asset.toUpperCase())?.image || SUPPORTED_CRYPTOS[trade.asset.toUpperCase()]?.logoUrl) && "hidden"
                                    )}>
                                        {trade.asset.slice(0, 2)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mb-2">Net Result</p>
                                <div className={cn(
                                    "text-5xl font-black tracking-tighter",
                                    isRunning ? "text-foreground" : (isProfit ? "text-emerald-500" : "text-rose-500")
                                )}>
                                    {isRunning ? '--' : `${isProfit ? '+' : ''}${pnl.toFixed(2)}`}
                                    <span className="text-sm ml-2 opacity-40">USDT</span>
                                </div>
                            </div>

                            {isRunning && (
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-white/5">
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Time Remaining</p>
                                        <div className="text-lg">
                                            <CountdownTimer expiresAt={trade.expiresAt} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Duration</p>
                                        <div className="text-lg font-black uppercase">{trade.duration}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Entry Details */}
                        <Card className="glass-card">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Entry Context</h3>
                                </div>

                                <DetailRow label="Investment" value={`$${amount.toFixed(2)}`} />
                                <DetailRow label="Entry Price" value={`$${entryPrice.toLocaleString()}`} />
                                <DetailRow label="Direction" value={trade.side.toUpperCase()} color={trade.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'} />
                                <DetailRow label="Timestamp" value={format(new Date(trade.createdAt), 'HH:mm:ss')} />
                            </CardContent>
                        </Card>

                        {/* Exit/Settlement Details */}
                        <Card className="glass-card">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Settlement</h3>
                                </div>

                                <DetailRow label="Exit Price" value={isRunning ? 'Pending...' : `$${exitPrice.toLocaleString()}`} />
                                <DetailRow label="P/L %" value={trade.profitMultiplier} />
                                <DetailRow label="Status" value={trade.status.toUpperCase()} />
                                <DetailRow label="Finalized At" value={trade.closedAt ? format(new Date(trade.closedAt), 'HH:mm:ss') : 'Active'} />
                            </CardContent>
                        </Card>
                    </div>

                    {!isRunning && (
                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-[#00D9C0]/10 flex items-center justify-center flex-shrink-0">
                                <Info className="h-6 w-6 text-[#00D9C0]" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-[#00D9C0] mb-1">Execution Finalized</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    This trade has been settled on the primary network. Funds have been credited to your USDT balance.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value, color }: { label: string, value: string, color?: string }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</span>
            <span className={cn("text-xs font-bold tracking-tight", color || "text-foreground")}>{value}</span>
        </div>
    );
}
