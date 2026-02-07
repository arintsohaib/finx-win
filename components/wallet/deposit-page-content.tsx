
/**
 * Deposit Page Content
 * Main component for crypto deposit flow with auto-generated QR codes
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Copy, Check, Upload, AlertCircle, Loader2, Info, RefreshCw, X } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';

interface CryptoWallet {
  id: string;
  currency: string;
  walletAddress: string;
  qrCodeUrl: string | null;
  network: string | null;
  minDepositUsdt: number;
}

interface DepositPageContentProps {
  currency: string;
}

export function DepositPageContent({ currency }: DepositPageContentProps) {
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

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to make a deposit');
      router.push('/');
      return;
    }
    fetchWalletInfo();
  }, [currency, user]);

  // Fetch crypto rate when USDT amount changes
  useEffect(() => {
    if (usdtAmount && parseFloat(usdtAmount) > 0 && currency) {
      fetchCryptoRate();
    } else {
      setCryptoAmount(0);
      setCryptoRate(0);
    }
  }, [usdtAmount, currency]);

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

      // Redirect back after error
      setTimeout(() => router.push('/wallet'), 2000);
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
        const amount = parseFloat(usdtAmount) / data.rate;
        setCryptoAmount(amount);
      } else {
        console.error('Failed to fetch crypto rate');
        toast.error('Failed to fetch exchange rate');
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
      toast.error('Failed to fetch exchange rate');
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
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

    // Validate minimum deposit in USDT
    const minDeposit = wallet.minDepositUsdt;
    if (usdtAmountNum < minDeposit) {
      toast.error(`Minimum deposit is ${minDeposit} USDT`);
      return;
    }

    if (cryptoAmount <= 0 || cryptoRate <= 0) {
      toast.error('Exchange rate not available. Please try again.');
      return;
    }

    // Screenshot is now optional - user can submit without it
    if (!screenshot) {
      console.log('[Deposit] No screenshot provided - proceeding without payment proof');
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('currency', currency);
      formData.append('usdtAmount', usdtAmount);
      formData.append('cryptoAmount', cryptoAmount.toString());
      formData.append('conversionRate', cryptoRate.toString());
      formData.append('walletAddress', user.walletAddress);

      // Only append screenshot if it exists
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      console.log('[Deposit] Submitting:', {
        currency,
        usdtAmount: usdtAmountNum,
        cryptoAmount,
        conversionRate: cryptoRate,
        screenshotSize: screenshot ? screenshot.size : 0,
      });

      const response = await fetch('/api/wallet/deposit-crypto', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Deposit request submitted successfully!');

        // Reset form
        setUsdtAmount('');
        setCryptoAmount(0);
        setCryptoRate(0);
        setScreenshot(null);
        setPreviewUrl(null);

        // Redirect to wallet after 2 seconds
        setTimeout(() => {
          router.push('/wallet?tab=history&subtab=deposits');
        }, 2000);
      } else {
        const errorMessage = data.error || 'Failed to submit deposit request';
        toast.error(errorMessage);
        console.error('[Deposit] Error:', errorMessage);
      }
    } catch (error) {
      console.error('[Deposit] Network error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wallet information...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Deposits Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              {currency} deposits are currently unavailable. Please contact support or try another currency.
            </p>
            <Button onClick={() => router.push('/wallet')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="gradientGhost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Deposit {currency}</h1>
          <p className="text-muted-foreground mt-1">
            Send {currency} to the address below and submit your transaction proof
          </p>
        </div>

        <div className="grid gap-6">
          {/* Deposit Address Card */}
          <Card className="glass-card border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Deposit Address</span>
                {wallet.network && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    {wallet.network}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-[auto_1fr] gap-6">
                {/* QR Code - Auto-Generated */}
                <div className="flex flex-col items-center">
                  {loadingQR ? (
                    <div className="w-48 h-48 bg-muted rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : qrCodeDataUrl ? (
                    <>
                      <div className="relative w-48 h-48 bg-white p-3 rounded-lg border-2 border-primary/20">
                        <Image
                          src={qrCodeDataUrl}
                          alt={`${currency} Deposit QR Code`}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Scan to get address</p>
                      <Button
                        variant="gradientGhost"
                        size="sm"
                        onClick={() => wallet.walletAddress && generateQRCode(wallet.walletAddress)}
                        className="mt-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center">
                      <p className="text-xs text-muted-foreground text-center px-4 mb-2">
                        QR Code unavailable
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => wallet.walletAddress && generateQRCode(wallet.walletAddress)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                  )}
                </div>

                {/* Address & Info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                    <div className="flex items-center gap-2 mt-1 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-xs sm:text-sm break-all font-mono">
                        {wallet.walletAddress}
                      </code>
                      <Button
                        type="button"
                        variant="gradientGhost"
                        size="sm"
                        onClick={handleCopy}
                        className="flex-shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                      <p className="font-medium mb-2">Important Information:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Only send {currency} to this address</li>
                        {wallet.network && <li>Network: {wallet.network}</li>}
                        <li>Minimum deposit: {wallet.minDepositUsdt} USDT</li>
                        <li>Deposits require admin approval</li>
                        <li>Payment proof is optional but recommended</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Submit Your Deposit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="usdtAmount" className="text-base">
                    Amount (USDT) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="usdtAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={`e.g., ${wallet.minDepositUsdt} USDT`}
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    className="text-lg h-12"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: {wallet.minDepositUsdt} USDT
                  </p>
                </div>

                {/* Show calculated crypto amount */}
                {cryptoAmount > 0 && (
                  <Card className="glass-card bg-muted border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">You need to send</p>
                          <p className="text-xl font-bold text-primary">
                            {cryptoAmount.toFixed(8)} {currency}
                          </p>
                        </div>
                        {isLoadingRate && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                      </div>
                      {cryptoRate > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Rate: 1 {currency} = ${cryptoRate.toFixed(2)} USDT
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="screenshot" className="text-base">
                    Payment Proof (Optional)
                  </Label>

                  {/* Custom File Upload Button with Responsive Layout */}
                  <div className="space-y-3">
                    {/* Hidden File Input */}
                    <input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Custom Upload Button and Filename Display */}
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3">
                      {/* Custom Upload Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('screenshot')?.click()}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 h-12 min-h-[48px] flex-shrink-0 touch-manipulation"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-base">Choose File</span>
                      </Button>

                      {/* Filename Display with Truncation */}
                      {screenshot && (
                        <div className="flex items-center gap-2 min-w-0 flex-1 px-4 py-3 bg-muted/50 rounded-md border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={screenshot.name}>
                              {screenshot.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(screenshot.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setScreenshot(null);
                              setPreviewUrl(null);
                            }}
                            className="h-9 w-9 p-0 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Placeholder when no file selected */}
                      {!screenshot && (
                        <span className="text-sm text-muted-foreground px-2">
                          No file chosen
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot showing your transaction (optional, max 5MB)
                    </p>
                  </div>

                  {/* Image Preview */}
                  {previewUrl && screenshot && (
                    <div className="relative mt-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <div className="relative w-32 h-32 flex-shrink-0">
                          <Image
                            src={previewUrl}
                            alt="Payment Proof Preview"
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Preview</p>
                          <p className="text-xs text-muted-foreground">
                            Ready to upload
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={submitting || !usdtAmount || cryptoAmount <= 0 || isLoadingRate}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Request...
                    </>
                  ) : isLoadingRate ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading Rate...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Submit Deposit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
