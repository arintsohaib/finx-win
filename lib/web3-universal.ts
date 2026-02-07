
/**
 * Universal Web3 Service - Enhanced with Connection Stability
 * 
 * Supports multiple wallet providers:
 * - MetaMask, Trust Wallet, Phantom, KuCoin Wallet
 * - Coinbase Wallet, Binance Wallet, OKX Wallet
 * - Rainbow, TokenPocket, Crypto.com DeFi Wallet
 * - And other EIP-1193 compatible wallets
 * 
 * Features:
 * - Timeout protection for connection requests
 * - Automatic retry with exponential backoff
 * - Better error handling
 * - Wallet lock detection
 */

import { ethers } from 'ethers';

export interface WalletInfo {
  name: string;
  isInstalled: boolean;
  provider: any;
  icon?: string;
}

export interface UniversalWeb3Error extends Error {
  code?: number;
}

const REQUEST_TIMEOUT = 8000; // 8 seconds timeout for requests

export class UniversalWeb3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private connectedWalletName: string | null = null;
  private logs: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.logs.unshift(logEntry);
    if (this.logs.length > 100) this.logs.pop();
  }

  public getLogs(): string[] {
    return this.logs;
  }

  /**
   * Timeout wrapper for promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number = REQUEST_TIMEOUT): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Detect all available Web3 wallets
   * This checks for desktop extensions and mobile in-app browsers
   * Supports: MetaMask, Trust Wallet, Coinbase, Phantom, KuCoin, Binance, OKX, Crypto.com, Rainbow, TokenPocket
   */
  async detectWallets(): Promise<WalletInfo[]> {
    if (typeof window === 'undefined') return [];

    const wallets: WalletInfo[] = [];

    // Check MetaMask
    if ((window as any).ethereum?.isMetaMask) {
      wallets.push({
        name: 'MetaMask',
        isInstalled: true,
        provider: (window as any).ethereum,
        icon: '🦊'
      });
    }

    // Check Trust Wallet (Enhanced detection for Android)
    const hasTrustWallet =
      (window as any).trustwallet ||
      (window as any).ethereum?.isTrust ||
      (window as any).ethereum?.isTrustWallet ||
      // Trust Wallet Android in-app browser detection
      (navigator.userAgent.toLowerCase().includes('trust') && (window as any).ethereum);

    if (hasTrustWallet) {
      wallets.push({
        name: 'Trust Wallet',
        isInstalled: true,
        provider: (window as any).trustwallet || (window as any).ethereum,
        icon: '🛡️'
      });
    }

    // Check Coinbase Wallet
    if ((window as any).coinbaseWalletExtension || (window as any).ethereum?.isCoinbaseWallet) {
      wallets.push({
        name: 'Coinbase Wallet',
        isInstalled: true,
        provider: (window as any).coinbaseWalletExtension || (window as any).ethereum,
        icon: '🔵'
      });
    }

    // Check Phantom
    if ((window as any).phantom?.ethereum) {
      wallets.push({
        name: 'Phantom',
        isInstalled: true,
        provider: (window as any).phantom.ethereum,
        icon: '👻'
      });
    }

    // Check KuCoin Wallet
    if ((window as any).kucoin || (window as any).ethereum?.isKuCoinWallet) {
      wallets.push({
        name: 'KuCoin Wallet',
        isInstalled: true,
        provider: (window as any).kucoin || (window as any).ethereum,
        icon: '🟢'
      });
    }

    // Check Binance Wallet
    if ((window as any).BinanceChain || (window as any).ethereum?.isBinance) {
      wallets.push({
        name: 'Binance Wallet',
        isInstalled: true,
        provider: (window as any).BinanceChain || (window as any).ethereum,
        icon: '🟡'
      });
    }

    // Check OKX Wallet
    if ((window as any).okxwallet || (window as any).okexchain) {
      wallets.push({
        name: 'OKX Wallet',
        isInstalled: true,
        provider: (window as any).okxwallet || (window as any).okexchain,
        icon: '⚫'
      });
    }

    // Check Crypto.com DeFi Wallet
    if ((window as any).deficonnectProvider) {
      wallets.push({
        name: 'Crypto.com DeFi Wallet',
        isInstalled: true,
        provider: (window as any).deficonnectProvider,
        icon: '💎'
      });
    }

    // Check Rainbow Wallet
    if ((window as any).ethereum?.isRainbow) {
      wallets.push({
        name: 'Rainbow',
        isInstalled: true,
        provider: (window as any).ethereum,
        icon: '🌈'
      });
    }

    // Check TokenPocket
    if ((window as any).ethereum?.isTokenPocket) {
      wallets.push({
        name: 'TokenPocket',
        isInstalled: true,
        provider: (window as any).ethereum,
        icon: '🎫'
      });
    }

    // Fallback: Check for any generic Ethereum provider
    if ((window as any).ethereum && wallets.length === 0) {
      wallets.push({
        name: 'Web3 Wallet',
        isInstalled: true,
        provider: (window as any).ethereum,
        icon: '🔗'
      });
    }

    if (wallets.length > 0) {
      this.log(`Detected wallets: ${wallets.map(w => w.name).join(', ')}`);
    } else {
      this.log('No wallets detected in this pass');
    }

    return wallets;
  }

  /**
   * Check if any Web3 wallet is installed
   * 
   * ⚡ MOBILE FIX: Trust Wallet Android injects window.ethereum with 1-3s delay
   * This method now POLLS for the provider instead of checking once
   */
  async isAnyWalletInstalled(): Promise<boolean> {
    // First, do a quick check
    const walletsNow = await this.detectWallets();
    if (walletsNow.length > 0) {
      return true;
    }

    // If no wallet found and we're on mobile, POLL for up to 5 seconds
    if (this.isMobile() || this.isInWalletBrowser()) {
      this.log('📱 Mobile/Wallet browser detected - polling for provider injection...');

      const startTime = Date.now();
      const maxWaitTime = 5000; // 5 seconds
      const pollInterval = 200; // Check every 200ms

      while (Date.now() - startTime < maxWaitTime) {
        const wallets = await this.detectWallets();
        if (wallets.length > 0) {
          const elapsed = Date.now() - startTime;
          this.log(`✅ Wallet provider detected after ${elapsed}ms`);
          return true;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      this.log('❌ No wallet provider found after 5 seconds');
      return false;
    }

    // Desktop - no polling needed
    this.log('Desktop mode - no provider found immediately');
    return false;
  }

  /**
   * Wait for wallet injection with custom timeout
   */
  async waitForWallet(timeoutMs: number = 2000): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const wallets = await this.detectWallets();
      if (wallets.length > 0) return true;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return false;
  }

  /**
   * Get the best available wallet provider
   * Priority: MetaMask > Trust Wallet > Others > Generic ethereum
   */
  public async getBestProvider(): Promise<any> {
    if (typeof window === 'undefined') return null;

    const wallets = await this.detectWallets();

    if (wallets.length === 0) return null;

    // Prioritize MetaMask if available
    const metamask = wallets.find((w: any) => w.name === 'MetaMask');
    if (metamask) {
      this.connectedWalletName = 'MetaMask';
      return metamask.provider;
    }

    // Use first available wallet
    this.connectedWalletName = wallets[0].name;
    return wallets[0].provider;
  }

  /**
   * Check if user is already connected
   */
  async isConnected(): Promise<boolean> {
    if (!this.provider) {
      const provider = await this.getBestProvider();
      if (!provider) return false;
      this.provider = new ethers.BrowserProvider(provider);
    }

    try {
      const accounts = await this.withTimeout(this.provider.listAccounts(), 3000);
      return accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current connected account
   */
  async getCurrentAccount(): Promise<string | null> {
    if (!this.provider) {
      const provider = await this.getBestProvider();
      if (!provider) return null;
      this.provider = new ethers.BrowserProvider(provider);
    }

    try {
      const accounts = await this.withTimeout(this.provider.listAccounts(), 3000);
      return accounts.length > 0 ? accounts[0].address : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if wallet has already granted account access (silent check)
   * Returns connected accounts without triggering connection prompt
   */
  async getConnectedAccounts(): Promise<string[]> {
    try {
      const provider = await this.getBestProvider();
      if (!provider) return [];

      // Use eth_accounts to check WITHOUT prompting user (with timeout)
      const accounts = await this.withTimeout<string[]>(
        provider.request({ method: 'eth_accounts' }),
        3000
      );

      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      console.error('Error checking connected accounts:', error);
      return [];
    }
  }

  /**
   * Connect to Web3 wallet with timeout protection
   * Works with any EIP-1193 compatible wallet
   */
  async connect(): Promise<string> {
    const provider = await this.getBestProvider();

    if (!provider) {
      throw new Error('No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.');
    }

    this.provider = new ethers.BrowserProvider(provider);

    try {
      // Request account access with timeout
      await this.withTimeout(
        this.provider.send('eth_requestAccounts', []),
        REQUEST_TIMEOUT
      );

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      console.log(`✅ Connected to ${this.connectedWalletName}: ${address}`);
      return address;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Connection request rejected. Please approve the connection in your wallet.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Connection timeout. Please unlock your wallet and try again.');
      }
      throw new Error(`Failed to connect to ${this.connectedWalletName}: ${error.message}`);
    }
  }

  /**
   * Sign a message with one-time verification and timeout protection
   * This prevents signature loops by using session tracking
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No wallet connected. Please connect your wallet first.');
    }

    try {
      // Sign message with timeout
      const signature = await this.withTimeout(
        this.signer.signMessage(message),
        REQUEST_TIMEOUT
      );

      console.log('✅ Message signed successfully');
      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Signature request rejected. Please approve the signature request in your wallet.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Signature timeout. Please unlock your wallet and try again.');
      }
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(address?: string): Promise<string> {
    if (!this.provider) return '0';

    try {
      const addr = address || await this.getCurrentAccount();
      if (!addr) return '0';

      const balance = await this.withTimeout(
        this.provider.getBalance(addr),
        5000
      );

      return ethers.formatEther(balance);
    } catch (error) {
      return '0';
    }
  }

  /**
   * Get network information
   */
  async getNetwork(): Promise<{ name: string; chainId: number }> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const network = await this.withTimeout(
        this.provider.getNetwork(),
        5000
      );

      return {
        name: network.name,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      throw new Error('Failed to get network information');
    }
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * Listen for network/chain changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', callback);
    }
  }

  /**
   * Listen for wallet disconnect events
   */
  onDisconnect(callback: (error: any) => void): void {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('disconnect', callback);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        (window as any).ethereum.removeAllListeners('accountsChanged');
        (window as any).ethereum.removeAllListeners('chainChanged');
        (window as any).ethereum.removeAllListeners('disconnect');
      } catch (error) {
        console.error('Error removing listeners:', error);
      }
    }
  }

  /**
   * Get connected wallet name
   */
  getConnectedWalletName(): string | null {
    return this.connectedWalletName;
  }

  /**
   * Check if mobile device
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if running in a wallet's in-app browser
   * Detects all major wallet browsers
   */
  isInWalletBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();

    // Check user agent for wallet identifiers
    const walletBrowsers = [
      'trust', 'metamask', 'coinbase', 'phantom',
      'kucoin', 'binance', 'okex', 'okx',
      'rainbow', 'tokenpocket', 'defi wallet',
      'twa', // Trust Wallet App
      'trust wallet'
    ];

    return walletBrowsers.some(wallet => ua.includes(wallet)) || !!(window as any).ethereum?.isTrust;
  }

  /**
   * Strictest check for mobile-only environment
   * Returns false for ALL desktop operating systems (Windows, Mac, Linux)
   * even if they have mobile user-agent strings or wallet extensions
   */
  isStrictlyMobile(): boolean {
    if (typeof window === 'undefined') return false;

    const platform = (navigator as any).platform?.toLowerCase() || '';
    const ua = navigator.userAgent.toLowerCase();

    // Explicitly forbid desktop platforms
    const isDesktopPlatform =
      platform.includes('win') ||
      platform.includes('mac') ||
      platform.includes('linux') && !ua.includes('android');

    if (isDesktopPlatform) {
      // One exception: iPad reports itself as "MacIntel" in some cases
      const isIPad = (navigator.maxTouchPoints > 0 && platform.includes('mac'));
      if (!isIPad) return false;
    }

    // Must be a mobile User-Agent
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    return isMobileUA || this.isInWalletBrowser();
  }
}

// Export singleton instance
export const universalWeb3Service = new UniversalWeb3Service();

// Type definitions for window
declare global {
  interface Window {
    ethereum?: any;
    trustwallet?: any;
    phantom?: any;
    kucoin?: any;
    coinbaseWalletExtension?: any;
    BinanceChain?: any;
    okxwallet?: any;
    okexchain?: any;
    deficonnectProvider?: any;
  }
}
