'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';

/**
 * SIMPLIFIED AUTH HOOK
 * 
 * Flow:
 * 1. Check for existing session (cookie)
 * 2. If no session, try to detect and connect wallet
 * 3. Complete initialization (max 3 seconds)
 */
export function useAuthInitialization() {
    const { user, login, disconnect } = useAuthStore();
    const [isInitializing, setIsInitializing] = useState(true);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Hard timeout - never stuck for more than 3 seconds
        const timeout = setTimeout(() => setIsInitializing(false), 3000);

        const init = async () => {
            try {
                // 1. Check existing session
                const res = await fetch('/api/auth/wallet-login', {
                    method: 'GET',
                    credentials: 'include',
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated && data.user) {
                        login(data.user);
                        setIsInitializing(false);
                        clearTimeout(timeout);
                        return;
                    }
                }

                // 2. Try auto-connect if wallet available
                const provider = getWalletProvider();
                if (provider) {
                    try {
                        const accounts = await provider.request({ method: 'eth_accounts' });
                        if (accounts?.length > 0) {
                            await authenticateWallet(accounts[0], login);
                        }
                    } catch {
                        // Silent fail - user will see connect button
                    }
                }
            } catch (err) {
                console.error('[Auth] Error:', err);
            } finally {
                clearTimeout(timeout);
                setIsInitializing(false);
            }
        };

        init();

        return () => clearTimeout(timeout);
    }, [login]);

    const logout = async () => {
        try {
            await disconnect();
        } catch { }
    };

    return {
        isInitializing,
        isAuthenticated: !!user,
        user,
        logout
    };
}

/**
 * Get wallet provider (MetaMask, Trust Wallet, etc.)
 */
function getWalletProvider(): any {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    return w.ethereum || w.trustwallet || w.phantom?.ethereum || null;
}

/**
 * Authenticate with backend
 */
async function authenticateWallet(address: string, login: (u: any) => void): Promise<boolean> {
    try {
        const res = await fetch('/api/auth/wallet-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ walletAddress: address }),
        });

        if (res.ok) {
            const data = await res.json();
            login(data.user);
            toast.success('Wallet connected!');
            return true;
        }
    } catch { }
    return false;
}

/**
 * Manual connect function for button clicks
 */
export async function connectWallet(login: (u: any) => void): Promise<boolean> {
    const provider = getWalletProvider();
    if (!provider) {
        toast.error('Please install MetaMask or Trust Wallet');
        return false;
    }

    try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts?.length > 0) {
            return await authenticateWallet(accounts[0], login);
        }
    } catch (err: any) {
        if (err.code !== 4001) {
            toast.error('Connection failed');
        }
    }
    return false;
}
