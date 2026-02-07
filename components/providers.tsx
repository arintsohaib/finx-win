
'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const BackgroundJobs = dynamic(
  () => import('@/components/background-jobs').then(mod => mod.BackgroundJobs),
  { ssr: false }
);
// Dynamic import with SSR disabled to prevent ethers/web3 stack from initializing
const EnhancedWalletDetector = dynamic(
  () => import('@/components/auth/enhanced-wallet-detector').then(mod => mod.EnhancedWalletDetector),
  { ssr: false }
);

const Web3Provider = dynamic(
  () => import('@/components/auth/web3-provider').then(mod => mod.Web3Provider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Robust admin detection: check both hook and window.location
  const isAdmin = pathname?.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin routes: Skip Web3Provider entirely to avoid any Web3-related crashes
  if (isAdmin) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    );
  }

  // User routes: Full Web3 experience
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <Web3Provider>
        {!mounted ? (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <EnhancedWalletDetector />
            <BackgroundJobs />
            {children}
          </>
        )}
      </Web3Provider>
    </ThemeProvider>
  );
}
