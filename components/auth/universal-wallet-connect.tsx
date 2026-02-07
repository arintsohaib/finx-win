
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, Wallet, Smartphone, Monitor, Info, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { universalWeb3Service } from '@/lib/web3-universal';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Universal Wallet Connect Component
 * 
 * 📱 MOBILE-FIRST & SEAMLESS:
 * - Automatically attempts connection if in a wallet browser
 * - No manual button click required for same wallet address
 * - Dynamic UI reflects connection status
 * - Dark mode compatible
 */

export function UniversalWalletConnect() {
  const { connectWallet, isLoading, error, isConnected, user } = useAuthStore();
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('🔍 Initializing wallet detection...');
    initializeConnection();
  }, []);

  // 🚀 SEAMLESS AUTO-CONNECT EFFECT:
  // Watch for wallet installation and trigger connection immediately on mobile
  useEffect(() => {
    const triggerAutoConnect = async () => {
      const installed = hasWallet === true;
      const shouldAutoConnect = installed && isMobile && !isConnected && !autoConnectAttempted && !isLoading;

      if (shouldAutoConnect) {
        console.log('🚀 [Auto-Connect] Mobile wallet detected - triggering popup...');
        setAutoConnectAttempted(true);

        // Small delay to ensure provider injection is stable
        setTimeout(() => {
          handleConnect();
        }, 300);
      }
    };

    triggerAutoConnect();
  }, [hasWallet, isConnected, isMobile, autoConnectAttempted, isLoading]);

  const initializeConnection = async () => {
    try {
      const mobileStatus = universalWeb3Service.isMobile();
      const inWalletBrowser = universalWeb3Service.isInWalletBrowser();

      setIsMobile(mobileStatus);
      setIsInWalletBrowser(inWalletBrowser);

      const installed = await universalWeb3Service.isAnyWalletInstalled();
      setHasWallet(installed);
      console.log('✅ Wallet detection complete:', { installed, mobileStatus, inWalletBrowser });
    } catch (error) {
      console.error('❌ Wallet detection error:', error);
      setHasWallet(false);
    }
  };

  const handleConnect = async () => {
    console.log('🔐 Initiating wallet connection');
    try {
      await connectWallet();
    } catch (err) {
      console.error('Connection aborted or failed:', err);
    }
  };

  // 1. LOADING STATE - Show if we're detection or connecting
  // We MUST show this if isLoading is true to provide feedback for the auto-popup
  if (hasWallet === null || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-minimal p-4 bg-background">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardContent className="pt-10 pb-10">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-3">
                <p className="font-bold text-2xl text-foreground">Secure Connection</p>
                <p className="text-muted-foreground animate-pulse">
                  {isLoading ? 'Requesting wallet connection...' : 'Establishing secure link with your Web3 wallet...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. NO WALLET DETECTED - Show installation options
  if (!hasWallet) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-minimal p-4 bg-background">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-orange-500/10 w-fit">
              <Download className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle className="text-2xl">Web3 Wallet Required</CardTitle>
            <CardDescription>
              Install a Web3 wallet to access our trusted trading platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-primary/10 border-primary/50">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground">
                <strong className="text-foreground">Access reliable trading signals</strong> and grow your trading opportunities.
                Join thousands of successful traders today!
              </AlertDescription>
            </Alert>

            {isMobile && (
              <Alert className="bg-blue-500/10 border-blue-500/50 dark:bg-blue-500/20">
                <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-foreground">
                  <strong>Mobile User:</strong> Please use a mobile wallet app like <strong>MetaMask</strong> or <strong>Trust Wallet</strong>.
                </AlertDescription>
              </Alert>
            )}

            {!isMobile && (
              <Alert className="bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20">
                <Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-sm text-foreground">
                  <strong>Desktop User:</strong> We recommend using mobile wallet apps' built-in browsers for the best experience.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button onClick={() => window.open('https://metamask.io/download/', '_blank')} variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 hover:border-primary">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold">MetaMask</span>
              </Button>
              <Button onClick={() => window.open('https://trustwallet.com/download', '_blank')} variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 hover:border-primary">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold">Trust Wallet</span>
              </Button>
              <Button onClick={() => window.open('https://phantom.app/download', '_blank')} variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 hover:border-primary">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold">Phantom</span>
              </Button>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={initializeConnection} className="text-sm text-muted-foreground hover:text-foreground">
                Check Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. WALLET DETECTED BUT NOT CONNECTED (Fall-back UI)
  return (
    <div className="flex items-center justify-center min-h-screen gradient-minimal p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription>
            {isInWalletBrowser ? 'Completing secure connection...' : 'Securely connect your Web3 wallet to start trading'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-primary/10 border-primary/50">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-foreground">
              <strong className="text-foreground">Access reliable trading signals</strong> and join thousands of successful traders.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full h-12 text-lg font-bold shadow-lg transition-all active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-2">
            <p>Your session will remain active for the same wallet address.</p>
            <p>Switching wallets will automatically switch accounts.</p>
          </div>

          <Alert className="bg-blue-500/10 border-blue-500/50 dark:bg-blue-500/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-foreground">
              <strong>One-time verification:</strong> Signing proves wallet ownership. It is 100% free and does not spend any assets.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
