
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * LEGACY ROUTE - DEPRECATED
 * This route is no longer used. Withdrawals are now handled via the wallet dashboard.
 * Redirecting to wallet page...
 */

interface WithdrawPageProps {
  params: Promise<{
    currency: string;
  }>;
}

export default function WithdrawPage({ params }: WithdrawPageProps) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to wallet page
    router.replace('/wallet');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to wallet...</p>
    </div>
  );
}
