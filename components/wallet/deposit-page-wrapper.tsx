
/**
 * Deposit Page Wrapper
 * Client component wrapper for the deposit page content
 */

'use client';

import { DepositPageContent } from './deposit-page-content';

interface DepositPageWrapperProps {
  currency: string;
}

export function DepositPageWrapper({ currency }: DepositPageWrapperProps) {
  return <DepositPageContent currency={currency} />;
}
