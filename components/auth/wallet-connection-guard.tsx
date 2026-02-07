'use client';

import React, { useState } from 'react';
import { useAuthInitialization, connectWallet } from '@/hooks/use-wallet-auto-login';
import { useAuthStore } from '@/lib/stores/auth-store';
import { SuspensionOverlay } from '@/components/auth/suspension-overlay';
import { usePathname } from 'next/navigation';

/**
 * Internal component that handles wallet authentication guard for user routes.
 * This component is ONLY rendered for non-admin routes.
 */
function UserWalletGuard({ children }: { children: React.ReactNode }) {
    const { isInitializing, isAuthenticated, user } = useAuthInitialization();
    const setUser = useAuthStore((state) => state.setUser);
    const [connecting, setConnecting] = useState(false);

    // Show suspension overlay if user is suspended
    if (isAuthenticated && user?.isSuspended) {
        return <SuspensionOverlay reason={user.suspensionReason || null} />;
    }

    // Loading state (max 3 seconds)
    if (isInitializing) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show connect button
    if (!isAuthenticated) {
        const handleConnect = async () => {
            setConnecting(true);
            await connectWallet(setUser);
            setConnecting(false);
        };

        return (
            <div className="flex items-center justify-center min-h-screen gradient-subtle p-4">
                <div className="w-full max-w-sm glass-card rounded-3xl p-8 text-center space-y-6">
                    <div className="gradient-icon-box w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-4 ring-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                        </svg>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Connect Wallet</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Use MetaMask, Trust Wallet, or any Web3 wallet to continue
                        </p>
                    </div>

                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 active:scale-95"
                    >
                        {connecting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Connecting...
                            </span>
                        ) : 'Connect Wallet'}
                    </button>

                    <p className="text-xs text-muted-foreground bg-white/5 py-2 px-3 rounded-lg inline-block">
                        On mobile? Open in your wallet browser
                    </p>
                </div>
            </div>
        );
    }

    // Authenticated - render children
    return <>{children}</>;
}

/**
 * WALLET CONNECTION GUARD
 * 
 * Shows loading for max 3 seconds, then either:
 * - Renders children if authenticated (for user routes)
 * - Shows connect wallet button if not
 * - Passes through children for admin routes (no Web3 hooks called)
 */
export function WalletConnectionGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Check route FIRST before any Web3 hooks can be called
    const isAdminRoute = pathname?.startsWith('/admin') ||
        (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

    // Admin routes: Pass through children immediately, no Web3 hooks
    if (isAdminRoute) {
        return <>{children}</>;
    }

    // User routes: Render component with Web3 hooks
    return <UserWalletGuard>{children}</UserWalletGuard>;
}

