
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, AlertCircle, Smartphone, Monitor, Info } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { universalWeb3Service } from '@/lib/web3-universal';

/**
 * Wallet Required Page - MOBILE WALLET ONLY
 * 
 * This is now the landing page for ALL desktop visitors.
 * It strictly forbids desktop access as per user requirements.
 */

const RECOMMENDED_WALLETS = [
  {
    name: 'Trust Wallet',
    badge: 'Highly Recommended',
    color: 'from-blue-500 to-cyan-500',
    android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
  },
  {
    name: 'MetaMask Mobile',
    badge: 'Highly Recommended',
    color: 'from-orange-500 to-amber-500',
    android: 'https://play.google.com/store/apps/details?id=io.metamask',
    ios: 'https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202'
  },
  {
    name: 'KuCoin Wallet',
    badge: 'Recommended',
    color: 'from-green-500 to-emerald-500',
    android: 'https://play.google.com/store/apps/details?id=com.kubi.kucoin',
    ios: 'https://apps.apple.com/app/kucoin-buy-bitcoin-crypto/id1378956601'
  },
  {
    name: 'Phantom',
    badge: 'Recommended',
    color: 'from-purple-500 to-indigo-500',
    android: 'https://play.google.com/store/apps/details?id=app.phantom',
    ios: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977'
  },
];

export function WalletRequiredPage() {
  const router = useRouter();
  const { connectWallet, isLoading, user } = useAuthStore();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if on desktop
    setIsDesktop(!universalWeb3Service.isStrictlyMobile());

    // If user gets authenticated ON MOBILE, redirect to home
    if (user && universalWeb3Service.isStrictlyMobile()) {
      router.replace('/');
    }
  }, [user, router]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const success = await connectWallet();
      if (success) {
        console.log('[Wallet Required] Connection successful');
      }
    } catch (err) {
      console.error('[Wallet Required] Connection failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            {isDesktop ? (
              <Monitor className="h-10 w-10 text-primary" />
            ) : (
              <Smartphone className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold">
            {isDesktop ? 'Mobile Only Access' : 'Wallet Required'}
          </CardTitle>
          <CardDescription className="text-base">
            {isDesktop
              ? 'FinX is strictly designed for mobile Web3 wallet browsers.'
              : 'Please connect your mobile Web3 wallet to start trading on FinX.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Desktop Alert */}
          {isDesktop && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div className="text-sm">
                <p className="font-bold text-red-500">🚫 Desktop Access Forbidden</p>
                <p className="mt-1 text-muted-foreground">
                  Windows, Mac, and Linux browsers (including wallet extensions) are <strong>not supported</strong>.
                  Please switch to your mobile device.
                </p>
              </div>
            </div>
          )}

          {/* How to Access */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              How to Access Successfully:
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</div>
                <p className="text-sm text-muted-foreground">Download a <strong>Web3 Wallet App</strong> (MetaMask or Trust Wallet) on your mobile phone.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</div>
                <p className="text-sm text-muted-foreground">Open the <strong>Browser/DApps</strong> section inside the wallet app.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</div>
                <p className="text-sm text-muted-foreground">Enter our website URL and connect your wallet to start trading!</p>
              </div>
            </div>
          </div>

          {/* Recommended Wallets */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-bold mb-4 text-center">Recommended Wallets</p>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDED_WALLETS.slice(0, 2).map((wallet) => (
                <div key={wallet.name} className={`rounded-lg bg-gradient-to-br ${wallet.color} p-3 text-center transition-transform hover:scale-105`}>
                  <p className="text-xs font-black text-white uppercase tracking-tighter">{wallet.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-center text-muted-foreground italic uppercase font-bold tracking-widest">
              Available on App Store & Play Store
            </p>
          </div>

          {/* Action Button - Only for mobile users who might be in a regular browser */}
          {!isDesktop && (
            <Button
              onClick={handleRetry}
              disabled={isLoading || isRetrying}
              className="w-full h-14 text-lg font-black uppercase tracking-wide shadow-xl"
              size="lg"
            >
              {isLoading || isRetrying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </span>
              )}
            </Button>
          )}

          {isDesktop && (
            <p className="text-center text-xs text-muted-foreground font-medium italic">
              Please visit this site from your mobile phone for full dashboard access.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Loader component for the button
function Loader2({ className }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}></div>
  );
}
