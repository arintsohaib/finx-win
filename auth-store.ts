
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { universalWeb3Service } from '@/lib/web3-universal';
import { sessionManager } from '@/lib/session-manager';

interface BalanceDetail {
  total: string;
  realBalance: string;
  realWinnings: string;
  frozenBalance: string;
}

interface User {
  walletAddress: string;
  uid: string;
  balances: Record<string, string>;
  balanceDetails?: Record<string, BalanceDetail>;
  isSuspended?: boolean;
  suspensionReason?: string | null;
}

interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  isRefreshingBalances: boolean; // New: Track if balances are being refreshed
  user: User | null;
  error: string | null;
  connectionInProgress: boolean; // Prevent multiple simultaneous connections
  lastConnectionAttempt: number; // Track last connection attempt timestamp

  // Actions
  setLoading: (loading: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setError: (error: string | null) => void;
  setUser: (user: User | null) => void;
  connectWallet: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  refreshBalances: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isLoading: false,
      isInitializing: false,
      isRefreshingBalances: false,
      user: null,
      error: null,
      connectionInProgress: false,
      lastConnectionAttempt: 0,

      setLoading: (loading) => set({ isLoading: loading }),

      setInitializing: (initializing) => set({ isInitializing: initializing }),

      setError: (error) => set({ error }),

      setUser: (user) => set({
        user,
        isConnected: !!user,
        error: null
      }),

      // Simplified connectWallet - no longer used for auto-connect
      // Only for manual connection from UI
      connectWallet: async () => {
        const state = get();

        // Prevent multiple simultaneous attempts
        if (state.connectionInProgress) {
          console.log('[Store] Connection already in progress');
          return false;
        }

        // If already connected, don't reconnect
        if (state.isConnected && state.user) {
          console.log('[Store] Already connected');
          return true;
        }

        const { setLoading, setError, setUser } = get();

        try {
          set({ connectionInProgress: true });
          setLoading(true);
          setError(null);

          // Check if wallet is installed
          if (!await universalWeb3Service.isAnyWalletInstalled()) {
            setError('No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.');
            return false;
          }

          // Connect to wallet
          const walletAddress = await universalWeb3Service.connect();

          // Authenticate with backend
          const authResponse = await fetch('/api/auth/wallet-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ walletAddress })
          });

          if (!authResponse.ok) {
            const error = await authResponse.json();
            throw new Error(error.error || 'Authentication failed');
          }

          const { user } = await authResponse.json();

          // Transform balances array into object format
          const balancesObj: Record<string, string> = {};
          const balanceDetailsObj: Record<string, BalanceDetail> = {};

          if (user.balances && Array.isArray(user.balances)) {
            user.balances.forEach((balance: any) => {
              balancesObj[balance.currency] = balance.amount.toString();
              balanceDetailsObj[balance.currency] = {
                total: (parseFloat(balance.realBalance?.toString() || '0') + parseFloat(balance.realWinnings?.toString() || '0')).toString(),
                realBalance: balance.realBalance?.toString() || '0',
                realWinnings: balance.realWinnings?.toString() || '0',
                frozenBalance: balance.frozenBalance?.toString() || '0'
              };
            });
          }

          // Save session
          sessionManager.saveSession(walletAddress);

          // Set user
          setUser({
            walletAddress: user.walletAddress,
            uid: user.uid || '000000',
            balances: balancesObj,
            balanceDetails: balanceDetailsObj,
            isSuspended: user.isSuspended,
            suspensionReason: user.suspensionReason
          });

          return true;

        } catch (error: any) {
          console.error('[Store] Wallet connection error:', error);

          setError(error.message || 'Failed to connect wallet');

          set({
            isConnected: false,
            user: null
          });
          sessionManager.clearSession();
          return false;
        } finally {
          setLoading(false);
          set({ connectionInProgress: false });
        }
      },

      disconnect: async () => {
        try {
          // 1. Remove wallet event listeners FIRST to prevent ghost connections
          universalWeb3Service.removeAllListeners();

          // 2. Call backend logout
          await fetch('/api/auth/wallet-login', {
            method: 'DELETE',
            credentials: 'include'
          });

          // 3. Clear local session
          sessionManager.clearSession();

          // 4. Reset store state completely
          set({
            isConnected: false,
            user: null,
            error: null,
            connectionInProgress: false  // Reset flag to allow new connections
          });

          console.log('[Store] Complete disconnect successful');
        } catch (error) {
          console.error('[Store] Disconnect error:', error);
          // Still clear local state even if backend call fails
          universalWeb3Service.removeAllListeners();
          sessionManager.clearSession();
          set({
            isConnected: false,
            user: null,
            error: null,
            connectionInProgress: false
          });
        }
      },

      // Simplified checkSession - only checks, doesn't trigger connection
      checkSession: async () => {
        try {
          const response = await fetch('/api/auth/wallet-login', {
            method: 'GET',
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();

            if (data.authenticated && data.user) {
              const balancesObj: Record<string, string> = {};
              const balanceDetailsObj: Record<string, BalanceDetail> = {};

              if (data.user.balances && Array.isArray(data.user.balances)) {
                data.user.balances.forEach((balance: any) => {
                  balancesObj[balance.currency] = balance.amount;
                  balanceDetailsObj[balance.currency] = {
                    total: balance.amount,
                    realBalance: balance.realBalance || '0',
                    realWinnings: '0',
                    frozenBalance: '0'
                  };
                });
              }

              const userData: User = {
                walletAddress: data.user.walletAddress,
                uid: data.user.uid || '000000',
                balances: balancesObj,
                balanceDetails: balanceDetailsObj,
                isSuspended: data.user.isSuspended,
                suspensionReason: data.user.suspensionReason
              };

              set({
                isConnected: true,
                user: userData,
                error: null
              });
              return true;
            }
          }

          set({
            isConnected: false,
            user: null
          });
          return false;

        } catch (error) {
          console.error('[Store] Session check error:', error);
          set({
            isConnected: false,
            user: null
          });
          return false;
        }
      },

      refreshBalances: async () => {
        const { user } = get();
        if (!user) return;

        try {
          set({ isRefreshingBalances: true });
          const response = await fetch('/api/user/profile', {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            set(state => ({
              user: state.user ? {
                ...state.user,
                balances: data.user.balances,
                balanceDetails: data.user.balanceDetails
              } : null,
              isRefreshingBalances: false
            }));
          } else {
            set({ isRefreshingBalances: false });
          }
        } catch (error) {
          console.error('[Store] Balance refresh error:', error);
          set({ isRefreshingBalances: false });
        }
      }
    }),
    {
      name: 'trust-trade-auth',
      version: 2, // Increment to force invalid state cleanup
      migrate: (persistedState: any, version: number) => {
        console.log(`[Store] Migrating from version ${version} to 2`);
        if (version < 2) {
          console.warn('[Store] Old state detected, clearing to prevent crashes');
          return {
            isConnected: false,
            isLoading: false,
            isInitializing: false,
            user: null,
            error: null,
            connectionInProgress: false,
            lastConnectionAttempt: 0
          };
        }
        return persistedState as AuthState;
      },
      // Only persist user data for faster hydration
      // Don't persist connection state
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);
