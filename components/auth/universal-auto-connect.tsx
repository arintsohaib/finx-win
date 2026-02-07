
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthInitialization } from '@/hooks/use-wallet-auto-login';
import { Button } from '@/components/ui/button';

/**
 * Internal component that handles Web3 authentication for user routes.
 * This component is ONLY rendered for non-admin routes.
 */
function UserAutoConnect() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  // Single, consolidated auth initialization - SAFE to call here since we're only on user routes
  const { isInitializing, isAuthenticated, error } = useAuthInitialization();

  // Handle redirects
  useEffect(() => {
    if (isAuthenticated && pathname === '/wallet-required') {
      console.log('[Auto-Connect] Now authenticated, returning to dashboard');
      router.replace('/');
      return;
    }

    if (!isInitializing && !isAuthenticated && !hasRedirectedRef.current) {
      console.log('[Auto-Connect] No auth detected - deferring to page guard');
    }
  }, [isInitializing, isAuthenticated, pathname, router]);

  // Show error UI if authentication failed
  if (error && !isAuthenticated) {
    return null;
  }

  // Render nothing (headless component)
  return null;
}

/**
 * UNIVERSAL AUTO-CONNECT COMPONENT
 * 
 * Fixes all login loop issues and admin crashes by:
 * 1. Checking route BEFORE calling any hooks
 * 2. Rendering different components for admin vs user routes
 * 3. Admin routes render nothing (no Web3 hooks called)
 * 4. User routes render UserAutoConnect (Web3 hooks called)
 */
export function UniversalAutoConnect() {
  const pathname = usePathname();

  // Check route FIRST before any Web3 hooks can be called
  const isAdminRoute = pathname?.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  // Admin routes: Return null immediately, no Web3 hooks
  if (isAdminRoute) {
    return null;
  }

  // User routes: Render component with Web3 hooks
  return <UserAutoConnect />;
}

