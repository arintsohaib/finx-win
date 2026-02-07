'use client';

import React, { ReactNode, useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';
import { AdminFloatingChatButton } from '@/components/admin/chat/admin-floating-chat-button';
import { AdminChatModal } from '@/components/admin/chat/admin-chat-modal';
import { PERMISSIONS } from '@/lib/admin-constants';
import { toast } from 'sonner';

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
    loading?: boolean;
}

export function AdminLayout({ children, title, subtitle, actions, loading }: AdminLayoutProps) {
    const router = useRouter();
    const { admin, isLoading: authLoading, hasPermission, logout: handleAuthLogout } = useAdminAuth();
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeTrades: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
    });

    const { isConnected, subscribe } = useRealtimeAdmin();
    const isAuthenticated = !!admin;

    useEffect(() => {
        if (!authLoading) {
            if (!admin) {
                router.push('/admin/login');
            } else {
                fetchStats();

                // Standard stats subscription for sidebar badges
                const unsubscribeDeposit = subscribe('deposit:created', () => fetchStats());
                const unsubscribeWithdrawal = subscribe('withdrawal:created', () => fetchStats());

                return () => {
                    unsubscribeDeposit();
                    unsubscribeWithdrawal();
                };
            }
        }
    }, [admin, authLoading, router, subscribe]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`/api/admin/stats?t=${Date.now()}`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleLogout = () => {
        handleAuthLogout();
        localStorage.removeItem('admin_info');
        toast.success('Logged out successfully');
        router.push('/admin/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar
                admin={admin}
                stats={stats}
                hasPermission={hasPermission}
                onLogout={handleLogout}
            />

            <div className="flex-1 md:ml-64 min-h-screen flex flex-col transition-all">
                {/* Modern Header */}
                <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 transition-all">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold text-slate-900 truncate">
                                    {title || 'Admin Dashboard'}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={isConnected
                                        ? "text-[9px] h-4 px-1.5 text-green-600 border-green-200 bg-green-50"
                                        : "text-[9px] h-4 px-1.5 text-orange-600 border-orange-200 bg-orange-50"
                                    }
                                >
                                    {isConnected ? "LIVE" : "SYNCING"}
                                </Badge>
                            </div>
                            {subtitle && <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{subtitle}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                            {actions}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    {(authLoading && !admin) ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
                            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Synchronizing Session...</p>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                            {children}
                        </div>
                    )}
                </main>
            </div>

            {hasPermission(PERMISSIONS.MANAGE_CHAT) && (
                <>
                    <AdminFloatingChatButton
                        onClick={() => setIsChatModalOpen(true)}
                        isOpen={isChatModalOpen}
                    />
                    <AdminChatModal
                        isOpen={isChatModalOpen}
                        onClose={() => setIsChatModalOpen(false)}
                    />
                </>
            )}
        </div>
    );
}
