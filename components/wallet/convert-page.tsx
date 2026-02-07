
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, ArrowRight, Info, CheckCircle, ArrowLeft, Wallet, AlertTriangle } from 'lucide-react';
import { SUPPORTED_CRYPTOS, TRADING_CURRENCY } from '@/lib/wallet-config';
import { useCryptoPrices } from '@/hooks/use-crypto-prices';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ConvertPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, refreshBalances } = useAuthStore();
    const { getPrice } = useCryptoPrices();

    const initialCurrency = searchParams.get('from')?.toUpperCase() || 'BTC';
    const [fromCurrency, setFromCurrency] = useState(initialCurrency);
    const [amount, setAmount] = useState('');
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableBalance, setAvailableBalance] = useState(0);

    const fromConfig = SUPPORTED_CRYPTOS[fromCurrency];
    const toConfig = SUPPORTED_CRYPTOS[TRADING_CURRENCY];

    useEffect(() => {
        if (user && fromCurrency) {
            const b = parseFloat(user.balances?.[fromCurrency] || '0');
            setAvailableBalance(b);
        }
    }, [user, fromCurrency]);

    // Auto-fetch preview when amount or currency changes
    useEffect(() => {
        setError(null); // Clear error when amount or currency changes
        const delayDebounce = setTimeout(() => {
            if (amount && parseFloat(amount) > 0) {
                fetchPreview();
            } else {
                setPreview(null);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [amount, fromCurrency]);

    const fetchPreview = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/wallet/converter?from=${fromCurrency}&to=${TRADING_CURRENCY}&amount=${amount}&mode=to`
            );
            const data = await response.json();

            if (data.success) {
                setPreview(data.preview);
                setError(null);
            } else {
                setPreview(null);
                setError(data.error || 'Failed to get conversion preview');
            }
        } catch (error: any) {
            console.error('Preview error:', error);
            setPreview(null);
            setError('Connection error. Please check your internet.');
        } finally {
            setLoading(false);
        }
    };

    const handleConvert = async () => {
        if (!preview) return;

        try {
            setExecuting(true);
            setError(null);

            const response = await fetch('/api/wallet/converter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromCurrency,
                    toCurrency: TRADING_CURRENCY,
                    amount: preview.fromAmount, // Use the calculated fromAmount
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Successfully converted ${preview.fromAmount.toFixed(8)} ${fromCurrency} to ${preview.toAmount.toFixed(2)} ${TRADING_CURRENCY}`);
                refreshBalances();
                router.push('/wallet');
            } else {
                setError(data.error || 'Conversion failed');
                toast.error(data.error || 'Conversion failed');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            setError('Failed to execute conversion');
            toast.error('Failed to execute conversion');
        } finally {
            setExecuting(false);
        }
    };

    const handleMaxClick = () => {
        const fromPrice = getPrice(fromCurrency);
        const toPrice = getPrice(TRADING_CURRENCY) || 1;
        const rate = fromPrice / toPrice;
        const maxUsdt = availableBalance * rate;
        setAmount(maxUsdt.toFixed(2));
    };

    const handleCancel = () => {
        router.push(`/wallet/${fromCurrency}`);
    };

    const handleBack = () => {
        router.back();
    };

    const fromPrice = getPrice(fromCurrency);
    const usdValue = parseFloat(amount || '0') * fromPrice;

    if (!fromConfig || !toConfig) return null;

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
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">Asset Converter</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">Instant Swaps • Zero Fees</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Main Converter Card */}
                    <Card className="glass-card border-primary/20 overflow-hidden shadow-2xl">
                        <CardContent className="p-6 sm:p-8 space-y-8">
                            {/* From Section (Display only) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Estimated Cost</Label>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                        Available: <span className="text-foreground">{availableBalance.toFixed(8)} {fromCurrency}</span>
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 p-4 glass-morphism rounded-2xl border border-white/5 shadow-inner opacity-80">
                                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                            style={{ backgroundColor: fromConfig.color }}
                                        >
                                            {fromConfig.icon}
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-widest">{fromCurrency}</span>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <div className="text-2xl font-black tracking-tighter text-foreground h-8 flex items-center justify-end">
                                            {loading ? (
                                                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                            ) : preview ? (
                                                <span>{preview.fromAmount.toFixed(8)}</span>
                                            ) : (
                                                <span className="text-muted-foreground opacity-30">0.00000000</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Swap Icon */}
                            <div className="flex justify-center -my-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl glass-card border-white/10 shadow-xl flex items-center justify-center bg-secondary/80 backdrop-blur-xl">
                                    <ArrowRight className="h-6 w-6 text-primary rotate-90 sm:rotate-0" />
                                </div>
                            </div>

                            {/* To Section (Input) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Amount to Receive</Label>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={handleMaxClick}
                                        className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80"
                                    >
                                        USE MAX BALANCE
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4 p-4 glass-morphism rounded-2xl border border-[#00D9C0]/30 bg-[#00D9C0]/5 shadow-inner">
                                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                            style={{ backgroundColor: toConfig.color }}
                                        >
                                            {toConfig.icon}
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-widest">{TRADING_CURRENCY}</span>
                                    </div>
                                    <div className="flex-1 text-right">
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                                            className="text-2xl font-black tracking-tighter border-0 bg-transparent p-0 h-auto text-right focus-visible:ring-0 placeholder:text-muted-foreground/30"
                                            step="any"
                                        />
                                        {preview && (
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                                                1 {fromCurrency} = <span className="text-primary">{preview.rate.toFixed(4)}</span> {TRADING_CURRENCY}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <Info className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Warning/Info Box */}
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 items-start">
                                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Converting <span className="text-foreground font-bold">{fromCurrency}</span> to <span className="text-foreground font-bold">{TRADING_CURRENCY}</span> is required for trading. This swap is instant and execution cannot be reversed.
                                </p>
                            </div>

                            {/* Action Button */}
                            <Button
                                onClick={handleConvert}
                                disabled={!preview || loading || executing || parseFloat(amount) <= 0}
                                className="w-full h-16 rounded-2xl bg-[#00D9C0] hover:bg-[#00D9C0]/90 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-[#00D9C0]/30 active:scale-95 transition-all"
                            >
                                {executing ? (
                                    <><RefreshCw className="h-5 w-5 mr-3 animate-spin" /> Swapping...</>
                                ) : (
                                    <><CheckCircle className="h-5 w-5 mr-3" /> Execute Conversion</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
