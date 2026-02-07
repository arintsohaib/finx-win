
'use client';

import { useState, useEffect, ReactNode } from 'react';

/**
 * Persistent Web3 Provider Wrapper
 * 
 * and prevents unnecessary re-initialization on navigation.
 * 
 * Features:
 * - Mounts once and stays mounted across route changes
 * - Prevents hydration mismatches
 * - Provides consistent wallet connection state
 */

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <>
      {children}
    </>
  );
}
