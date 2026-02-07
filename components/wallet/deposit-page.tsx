
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Copy, Check, RefreshCw, CheckCircle, Upload, X, ArrowLeft } from 'lucide-react';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CryptoWallet {
    id: string;
    currency: string;
    walletAddress: string;
    qrCodeUrl: string | null;
    network: string | null;
    minDepositUsdt: number;
}

interface DepositPageProps {
    currency: string;
}

export function DepositPage({ currency }: DepositPageProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [wallet, setWallet] = useState<CryptoWallet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [loadingQR, setLoadingQR] = useState(false);

    // Form fields
    const [usdtAmount, setUsdtAmount] = useState('');
    const [cryptoAmount, setCryptoAmount] = useState(0);
    const [cryptoRate, setCryptoRate] = useState(0);
    const [isLoadingRate, setIsLoadingRate] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const cryptoConfig = SUPPORTED_CRYPTOS[currency];

    useEffect(() => {
        if (currency) {
            fetchWalletInfo();
            // Auto-fetch conversion rate when page loads (except for USDT)
            if (currency.toUpperCase() !== 'USDT') {
                fetchCryptoRate();
            } else {
                // For USDT, set rate to 1 (no conversion needed)
                setCryptoRate(1);
            }
        }
    }, [currency]);

    useEffect(() => {
        if (usdtAmount && parseFloat(usdtAmount) > 0 && cryptoRate > 0) {
            // Recalculate crypto amount when USDT amount changes
            const amount = parseFloat(usdtAmount) / cryptoRate;
            setCryptoAmount(amount);
        } else {
            setCryptoAmount(0);
        }
    }, [usdtAmount, cryptoRate]);

    const fetchWalletInfo = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/deposits/address/${currency}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch wallet information');
            }

            const data = await response.json();
            setWallet(data);

            // Auto-generate QR code from wallet address
            if (data.walletAddress) {
                generateQRCode(data.walletAddress);
            }
        } catch (error) {
            console.error('Error fetching wallet info:', error);
            toast.error(error instanceof Error ? error.message : `${currency} deposits are currently unavailable`);
            setWallet(null);
        } finally {
            setIsLoading(false);
        }
    };

    const generateQRCode = async (address: string) => {
        setLoadingQR(true);
        try {
            const response = await fetch(`/api/qr-code/generate?address=${encodeURIComponent(address)}`);

            if (response.ok) {
                const data = await response.json();
                setQrCodeDataUrl(data.qrCode);
            } else {
                console.error('Failed to generate QR code');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
        } finally {
            setLoadingQR(false);
        }
    };

    const fetchCryptoRate = async () => {
        setIsLoadingRate(true);
        try {
            const response = await fetch(`/api/crypto-rate?currency=${currency}`);

            if (response.ok) {
                const data = await response.json();
                setCryptoRate(data.rate);

                // Calculate crypto amount if USDT amount is entered
                if (usdtAmount && parseFloat(usdtAmount) > 0) {
                    const amount = parseFloat(usdtAmount) / data.rate;
                    setCryptoAmount(amount);
                }

                toast.success(`Rate updated: 1 ${currency} = ${data.rate.toFixed(6)} USDT`, {
                    duration: 2000,
                });
            } else {
                console.error('Failed to fetch crypto rate');
                toast.error('Unable to fetch exchange rate');
            }
        } catch (error) {
            console.error('Error fetching rate:', error);
            toast.error('Network error. Please check your connection.');
        } finally {
            setIsLoadingRate(false);
        }
    };

    const handleCopy = async () => {
        if (wallet?.walletAddress) {
            try {
                await navigator.clipboard.writeText(wallet.walletAddress);
                setCopied(true);
                toast.success('Address copied!');
                setTimeout(() => setCopied(false), 2000);
            } catch (error) {
                toast.error('Failed to copy address');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 8 * 1024 * 1024) {
                toast.error('File size must be less than 8 MB');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only JPG, JPEG, and PNG files are allowed');
                return;
            }

            setScreenshot(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!wallet || !user) {
            toast.error('You must be logged in to make a deposit');
            return;
        }

        const usdtAmountNum = parseFloat(usdtAmount);
        if (isNaN(usdtAmountNum) || usdtAmountNum <= 0) {
            toast.error('Please enter a valid USDT amount');
            return;
        }

        const minDeposit = wallet.minDepositUsdt;
        if (usdtAmountNum < minDeposit) {
            toast.error(`Minimum deposit is ${minDeposit} USDT`);
            return;
        }

        if (currency.toUpperCase() !== 'USDT' && (cryptoAmount <= 0 || cryptoRate <= 0)) {
            toast.error('Exchange rate not available');
            return;
        }

        const finalCryptoAmount = currency.toUpperCase() === 'USDT' ? usdtAmountNum : cryptoAmount;
        const finalCryptoRate = currency.toUpperCase() === 'USDT' ? 1 : cryptoRate;

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('currency', currency);
            formData.append('usdtAmount', usdtAmount);
            formData.append('cryptoAmount', finalCryptoAmount.toString());
            formData.append('conversionRate', finalCryptoRate.toString());
            formData.append('walletAddress', user.walletAddress);

            if (screenshot) {
                formData.append('screenshot', screenshot);
            }

            const response = await fetch('/api/wallet/deposit-crypto', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Deposit request submitted successfully!');
                router.push('/wallet/history');
            } else {
                toast.error(data.error || 'Failed to submit deposit request');
            }
        } catch (error) {
            console.error('Deposit error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
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
                        <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">Deposit {currency}</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                            Network: {wallet?.network || cryptoConfig.network || 'Mainnet'}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground uppercase tracking-widest text-xs font-black">Loading Wallet Info...</p>
                    </div>
                ) : !wallet ? (
                    <Card className="glass-card border-destructive/20 bg-destructive/5 overflow-hidden">
                        <CardContent className="p-8 text-center">
                            <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-6" />
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">{currency} Deposits Blocked</h2>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-6">
                                This asset is currently not available for deposits
                            </p>
                            <Button onClick={handleBack} variant="outline" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                                Back to Wallet
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Wallet Address Information */}
                        <Card className="glass-card border-primary/20 overflow-hidden shadow-2xl">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                    {/* QR Code */}
                                    <div className="flex-shrink-0">
                                        {loadingQR ? (
                                            <div className="w-48 h-48 glass-morphism rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : qrCodeDataUrl ? (
                                            <div className="relative w-48 h-48 bg-white p-3 rounded-2xl shadow-2xl">
                                                <Image
                                                    src={qrCodeDataUrl}
                                                    alt={`${currency} QR`}
                                                    fill
                                                    className="object-contain p-2"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-48 h-48 glass-morphism rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">QR Unavailable</p>
                                                <Button type="button" variant="outline" size="sm" onClick={() => generateQRCode(wallet.walletAddress)} className="rounded-xl h-10 px-4">
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    Retry
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Address Display */}
                                    <div className="flex-1 space-y-6 w-full">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                                                Official Deposit Address
                                                {wallet.network && (
                                                    <span className="ml-3 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        {wallet.network}
                                                    </span>
                                                )}
                                            </Label>
                                            <div className="flex items-center gap-3 p-4 glass-morphism rounded-2xl border border-white/5 shadow-inner group">
                                                <code className="flex-1 text-xs sm:text-sm break-all font-mono font-bold text-foreground">
                                                    {wallet.walletAddress}
                                                </code>
                                                <Button
                                                    type="button"
                                                    variant="gradientGhost"
                                                    size="icon"
                                                    onClick={handleCopy}
                                                    className="h-10 w-10 flex-shrink-0 rounded-xl"
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start text-left">
                                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Attention Required</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Only send <span className="text-foreground font-bold">{currency}</span> to this address via <span className="text-foreground font-bold">{wallet.network || 'Mainnet'}</span>.
                                                    Minimum deposit is <span className="text-foreground font-bold">{wallet.minDepositUsdt} USDT</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Exchange Rate Card (Non-USDT) */}
                        {cryptoRate > 0 && currency.toUpperCase() !== 'USDT' && (
                            <Card className="glass-card border-primary/20 bg-emerald-500/5 overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Live Exchange Rate</p>
                                            <p className="text-xl font-black tracking-tight text-foreground">
                                                1 {currency} = <span className="text-emerald-500">{cryptoRate.toFixed(6)}</span> USDT
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="gradientGhost"
                                            size="icon"
                                            onClick={fetchCryptoRate}
                                            disabled={isLoadingRate}
                                            className="h-12 w-12 rounded-2xl"
                                        >
                                            <RefreshCw className={cn("h-5 w-5", isLoadingRate && "animate-spin")} />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Amount Selection */}
                            <Card className="glass-card border-white/5">
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="usdtAmount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block mb-3">
                                                Amount to Deposit (USDT)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="usdtAmount"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder={`Min: ${wallet.minDepositUsdt}`}
                                                    value={usdtAmount}
                                                    onChange={(e) => setUsdtAmount(e.target.value)}
                                                    className="h-14 text-lg font-black tracking-tight rounded-2xl border-white/5 bg-secondary/30 focus:ring-primary/20"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {cryptoAmount > 0 && currency.toUpperCase() !== 'USDT' && (
                                            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Send Exactly</p>
                                                <p className="text-2xl font-black tracking-tighter text-primary">{cryptoAmount.toFixed(8)} {currency}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Screenshot Upload */}
                            <Card className="glass-card border-white/5">
                                <CardContent className="p-6">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block mb-3">
                                        Transaction Proof (Optional)
                                    </Label>
                                    <div className="space-y-4">
                                        <input
                                            id="screenshot"
                                            type="file"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        {!previewUrl ? (
                                            <div
                                                onClick={() => document.getElementById('screenshot')?.click()}
                                                className="h-32 rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
                                            >
                                                <Upload className="h-6 w-6 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Screenshot</span>
                                                <span className="text-[8px] uppercase tracking-tighter text-muted-foreground opacity-40 mt-1">JPG, PNG (Max 8MB)</span>
                                            </div>
                                        ) : (
                                            <div className="relative h-32 rounded-2xl border border-white/5 overflow-hidden group">
                                                <Image
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => { setScreenshot(null); setPreviewUrl(null); }}
                                                        className="h-10 w-10 rounded-xl"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Final Submission */}
                        <Button
                            type="submit"
                            disabled={submitting || !usdtAmount || isLoadingRate || (currency.toUpperCase() !== 'USDT' && cryptoAmount <= 0)}
                            className="w-full h-16 rounded-2xl bg-[#00D9C0] hover:bg-[#00D9C0]/90 text-white font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-[#00D9C0]/30 active:scale-95 transition-all"
                        >
                            {submitting ? (
                                <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Processing...</>
                            ) : (
                                <><CheckCircle className="h-5 w-5 mr-3" /> Execute Deposit Request</>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
