'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Dynamic imports with SSR disabled - only evaluated on client
const MainLayout = dynamic(
    () => import('@/components/layout/main-layout').then(mod => mod.MainLayout),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }
);

const UniversalAutoConnect = dynamic(
    () => import('@/components/auth/universal-auto-connect').then(mod => mod.UniversalAutoConnect),
    { ssr: false }
);

const WalletConnectionGuard = dynamic(
    () => import('@/components/auth/wallet-connection-guard').then(mod => mod.WalletConnectionGuard),
    { ssr: false }
);

/**
 * Client-side Layout Wrapper
 * 
 * Conditionally renders admin or user layout based on pathname.
 * Admin routes: Simple wrapper, no Web3 components loaded
 * User routes: Full Web3 stack with dynamic imports
 */
export function LayoutWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    // Robust admin detection with fallback
    const isAdmin = pathname?.startsWith('/admin') ||
        (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

    // Admin routes: Simple wrapper, no Web3 components
    if (isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                {children}
            </div>
        );
    }

    // User routes: Full Web3 stack with dynamically loaded components
    return (
        <>
            <UniversalAutoConnect />
            <MainLayout>
                <WalletConnectionGuard>
                    {children}
                </WalletConnectionGuard>
            </MainLayout>
        </>
    );
}
