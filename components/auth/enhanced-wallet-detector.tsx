
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Wallet Address Monitor - SIMPLE ADDRESS-CHANGE DETECTION
 * 
 * 📱 MOBILE-FIRST DESIGN:
 * - NO automatic logout
 * - Users stay logged in forever with the same wallet address
 * - Only re-authenticates when wallet ADDRESS CHANGES (different wallet)
 * - Data is tied to wallet address - switching back restores previous data
 * 
 * BEHAVIOR:
 * - If user switches to a DIFFERENT wallet address → re-authenticate (login as that wallet)
 * - If wallet is locked/disconnected → stay logged in (cookie-based session)
 * - If user creates NEW wallet → treated as new user when they connect
 * 
 * **EXCLUDES ADMIN ROUTES** (admin uses username/password)
 */

/**
 * Check if current route is an admin route
 */
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export function EnhancedWalletDetector() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, connectWallet } = useAuthStore();
  const lastKnownAddress = useRef<string | null>(null);

  useEffect(() => {
    // Skip monitoring on admin routes
    if (isAdminRoute(pathname)) {
      return;
    }

    // Track the current wallet address for change detection
    if (user?.walletAddress) {
      lastKnownAddress.current = user.walletAddress.toLowerCase();
    }

    // Setup listeners - with polling for late injection
    const initListeners = async () => {
      // 1. Check if provider exists (poll for up to 5s on mobile)
      const provider = await waitForProvider(5000);

      if (!provider) {
        console.log('📱 No wallet provider found - monitor inactive');
        return;
      }

      /**
       * Handle wallet address changes
       */
      const handleAccountsChanged = async (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          console.log('📱 Wallet locked/disconnected - user remains logged in via session');
          return;
        }

        const newAddress = accounts[0].toLowerCase();
        const currentAddress = lastKnownAddress.current;

        // If address changed, re-authenticate with the new wallet
        if (currentAddress && newAddress !== currentAddress) {
          console.log(`🔄 Wallet address changed: ${currentAddress.slice(0, 8)}... → ${newAddress.slice(0, 8)}...`);

          lastKnownAddress.current = newAddress;

          try {
            await connectWallet();
            console.log('✅ Successfully switched to wallet:', newAddress.slice(0, 8) + '...');
          } catch (err) {
            console.error('Failed to switch wallet:', err);
            router.replace('/wallet-required');
          }
        }
      };

      /**
       * Handle chain changes
       */
      const handleChainChanged = () => {
        console.log('⛓️ Chain changed - reloading page');
        window.location.reload();
      };

      // Set up event listeners
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);

      console.log('✅ Wallet address monitor active (no auto-logout)');
    };

    initListeners();
  }, [pathname, user, connectWallet, router]);

  return null; // This is a monitoring component
}

/**
 * Wait for wallet provider with polling
 */
async function waitForProvider(timeout: number = 3000): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}
