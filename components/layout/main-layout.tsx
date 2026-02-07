'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/stores/auth-store';
import { FloatingChatButton } from '@/components/chat/floating-chat-button';
import { Card, CardContent } from '@/components/ui/card';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { Footer } from './footer';
import { usePathname } from 'next/navigation';

// Dynamic import with SSR disabled to prevent ethers/web3 code from running during SSR
const UniversalWalletConnect = dynamic(
  () => import('@/components/auth/universal-wallet-connect').then(mod => mod.UniversalWalletConnect),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
);

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { isConnected } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Robust admin detection: check both hook and window.location
  const isAdmin = pathname?.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  // Note: We rely on WalletConnectionGuard in app/layout.tsx for initial checks
  // This component just handles the UI layout based on connection state

  // Bypass for admin routes - no wallet requirement
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {children}
      </div>
    );
  }

  // Not connected - show wallet connect
  if (!isConnected) {
    return <UniversalWalletConnect />;
  }

  // Connected - show the app
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div className="md:pl-64 flex-1 flex flex-col pb-20 md:pb-0">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>

      <MobileNav />

    </div>
  );
}
