
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, RefreshCw, X, ArrowLeft, Wallet, AlertTriangle } from 'lucide-react';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WithdrawPageProps {
    currency: string;
}

export function WithdrawPage({ currency }: WithdrawPageProps) {
    const router = useRouter();
    const { user, refreshBalances } = useAuthStore();
    const [usdtAmount, setUsdtAmount] = useState('');
    const [destinationAddress, setDestinationAddress] = useState('');
    const [cryptoAmount, setCryptoAmount] = useState(0);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);
    const [minimumWithdrawal, setMinimumWithdrawal] = useState(10);
    const [balance, setBalance] = useState(0);

    const cryptoConfig = SUPPORTED_CRYPTOS[currency];

    useEffect(() => {
        if (user && currency) {
            const b = parseFloat(user.balances?.[currency] || '0');
            setBalance(b);
        }
    }, [user, currency]);

    useEffect(() => {
        if (currency) {
            fetchCurrentPrice();
            fetchMinimumWithdraw();
        }
    }, [currency]);

    useEffect(() => {
        if (usdtAmount && currentPrice) {
            const usdt = parseFloat(usdtAmount);
            const crypto = usdt / currentPrice;
            setCryptoAmount(crypto);
        } else {
            setCryptoAmount(0);
        }
    }, [usdtAmount, currentPrice]);

    const fetchCurrentPrice = async () => {
        setIsLoadingPrice(true);
        try {
            const response = await fetch(`/api/crypto-rate?currency=${currency}`);
            if (response.ok) {
                const data = await response.json();
                setCurrentPrice(data.rate);
            }
        } catch (error) {
            console.error('Error fetching price:', error);
            toast.error('Failed to Fetch Price');
        } finally {
            setIsLoadingPrice(false);
        }
    };

    const fetchMinimumWithdraw = async () => {
        try {
            const response = await fetch('/api/crypto-wallets');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const wallet = data.find((w: any) => w.currency === currency);
                    if (wallet && wallet.minWithdrawUsdt) {
                        setMinimumWithdrawal(Number(wallet.minWithdrawUsdt));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching minimum withdraw:', error);
        }
    };

    const handleMaxClick = () => {
        if (balance > 0 && currentPrice > 0) {
            const maxUsdtValue = balance * currentPrice;
            setUsdtAmount(maxUsdtValue.toFixed(2));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!usdtAmount || !destinationAddress) {
            toast.error('Please fill in all required fields');
            return;
        }

        const usdt = parseFloat(usdtAmount);
        if (usdt <= 0) {
            toast.error('Invalid amount');
            return;
        }

        if (usdt < minimumWithdrawal) {
            toast.error(`Minimum withdrawal is $${minimumWithdrawal} USDT`);
            return;
        }

        if (cryptoAmount > balance) {
            toast.error('Insufficient Balance');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/withdrawals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currency,
                    usdtAmount: parseFloat(usdt.toFixed(2)),
                    destinationAddress,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Withdrawal Submitted! 🎉');
                refreshBalances();
                router.push('/wallet/history');
            } else {
                toast.error(data.error || 'Failed to submit withdrawal');
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    if (!cryptoConfig) return null;

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
                        <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">Withdraw {currency}</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                            Available: {balance.toFixed(8)} {currency}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Balance & Rate Card */}
                    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden shadow-2xl">
                        <CardContent className="p-6 sm:p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Available Assets</p>
                                    <p className="text-2xl font-black tracking-tighter text-foreground">{balance.toFixed(8)} {currency}</p>
                                    <p className="text-xs text-muted-foreground">≈ ${(balance * currentPrice).toFixed(2)} USDT</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Exchange Rate</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-black tracking-tight text-foreground">
                                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="gradientGhost"
                                            size="icon"
                                            onClick={fetchCurrentPrice}
                                            disabled={isLoadingPrice}
                                            className="h-8 w-8 rounded-lg"
                                        >
                                            <RefreshCw className={cn("h-4 w-4", isLoadingPrice && "animate-spin")} />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">1 {currency} in USDT</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Amount & Address Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="glass-card border-white/5">
                            <CardContent className="p-6">
                                <Label htmlFor="usdtAmount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block mb-3">
                                    Withdrawal Amount (USDT)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="usdtAmount"
                                        type="number"
                                        step="0.01"
                                        placeholder={`Min: $${minimumWithdrawal}`}
                                        value={usdtAmount}
                                        onChange={(e) => setUsdtAmount(e.target.value)}
                                        className="h-14 text-lg font-black tracking-tight rounded-2xl border-white/5 bg-secondary/30 pr-16"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="gradientGhost"
                                        size="sm"
                                        onClick={handleMaxClick}
                                        className="absolute right-2 top-2 h-10 px-3 rounded-xl font-black text-[10px]"
                                    >
                                        MAX
                                    </Button>
                                </div>
                                {cryptoAmount > 0 && (
                                    <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Estimated {currency}</p>
                                        <p className="text-xl font-black tracking-tighter text-primary">{cryptoAmount.toFixed(8)}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-white/5">
                            <CardContent className="p-6">
                                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block mb-3">
                                    Destination {currency} Address
                                </Label>
                                <Input
                                    id="address"
                                    type="text"
                                    placeholder="Paste your address here"
                                    value={destinationAddress}
                                    onChange={(e) => setDestinationAddress(e.target.value)}
                                    className="h-14 text-sm font-bold tracking-tight rounded-2xl border-white/5 bg-secondary/30"
                                    required
                                />
                                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-3 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Double check address
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Withdrawal Summary */}
                    {parseFloat(usdtAmount) > 0 && (
                        <Card className="glass-card border-[#00D9C0]/30 bg-[#00D9C0]/5 overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#00D9C0]/10 flex items-center justify-center">
                                            <ArrowRight className="h-6 w-6 text-[#00D9C0]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Final Execution</p>
                                            <p className="text-lg font-black tracking-tight text-foreground">
                                                {cryptoAmount.toFixed(8)} {currency} <span className="text-muted-foreground opacity-40 font-normal">→</span> External Wallet
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black tracking-tighter text-[#00D9C0]">
                                            ${parseFloat(usdtAmount).toFixed(2)}
                                            <span className="text-xs ml-1 opacity-60">USDT</span>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit Action */}
                    <Button
                        type="submit"
                        disabled={isSubmitting || isLoadingPrice || !usdtAmount || !destinationAddress || parseFloat(usdtAmount) < minimumWithdrawal || cryptoAmount > balance}
                        className="w-full h-16 rounded-2xl bg-[#00D9C0] hover:bg-[#00D9C0]/90 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-[#00D9C0]/30 active:scale-95 transition-all"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Processing...</>
                        ) : (
                            <><CheckCircle className="h-5 w-5 mr-3" /> Submit Withdrawal</>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

function CheckCircle(props: any) {
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
            <path d="m9 11 3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    )
}
