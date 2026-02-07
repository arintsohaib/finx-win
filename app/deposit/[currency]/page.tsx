
/**
 * Crypto Deposit Page
 * Allows users to deposit specific cryptocurrencies
 */

import { Suspense } from 'react';
import { DepositPageWrapper } from '@/components/wallet/deposit-page-wrapper';
import { Loader2 } from 'lucide-react';

interface DepositPageProps {
  params: Promise<{
    currency: string;
  }>;
}

export default async function DepositPage({ params }: DepositPageProps) {
  const { currency } = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DepositPageWrapper currency={currency.toUpperCase()} />
    </Suspense>
  );
}
