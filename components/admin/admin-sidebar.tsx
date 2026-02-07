'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Users, Inbox, FileCheck,
    TrendingUp, Settings, Wallet, ShieldCheck,
    Mail, ChevronRight, Activity, Clock, Globe,
    Shield, LogOut, Menu, X, ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PERMISSIONS } from '@/lib/admin-constants';

interface SidebarItem {
    title: string;
    href: string;
    icon: any;
    permission?: string | string[];
    badge?: number;
    submenu?: { title: string; href: string; icon: any }[];
}

interface AdminSidebarProps {
    admin: any;
    stats?: {
        pendingDeposits: number;
        pendingWithdrawals: number;
    };
    hasPermission: (permission: any) => boolean;
    onLogout: () => void;
}

export function AdminSidebar({ admin, stats, hasPermission, onLogout }: AdminSidebarProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems: SidebarItem[] = [
        {
            title: 'Dashboard',
            href: '/admin/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: 'Users',
            href: '/admin/dashboard?tab=users',
            icon: Users,
            permission: PERMISSIONS.MANAGE_USERS,
        },
        {
            title: 'Wallet Requests',
            href: '/admin/dashboard?tab=wallet-requests',
            icon: Inbox,
            badge: (stats?.pendingDeposits || 0) + (stats?.pendingWithdrawals || 0),
            permission: [PERMISSIONS.MANAGE_DEPOSITS, PERMISSIONS.MANAGE_WITHDRAWALS],
        },
        {
            title: 'KYC Verification',
            href: '/admin/dashboard?tab=kyc',
            icon: FileCheck,
            permission: PERMISSIONS.MANAGE_USERS,
        },
        {
            title: 'Assets & Markets',
            href: '/admin/assets',
            icon: TrendingUp,
            permission: PERMISSIONS.MANAGE_TRADE_SETTINGS,
            submenu: [
                { title: 'Asset Listing', href: '/admin/assets', icon: Settings },
                { title: 'Delivery Times', href: '/admin/assets/durations', icon: Clock },
                { title: 'Trade Control', href: '/admin/assets/trade-control', icon: Globe },
            ]
        },
        {
            title: 'Crypto Settings',
            href: '/admin/dashboard?tab=crypto-settings',
            icon: Wallet,
            permission: PERMISSIONS.MANAGE_WALLET_SETTINGS,
        },
        {
            title: 'Manage Admins',
            href: '/admin/dashboard?tab=admin-management',
            icon: ShieldCheck,
            permission: PERMISSIONS.MANAGE_ADMINS,
        },
        {
            title: 'Mail Server',
            href: '/admin/dashboard?tab=mail-server',
            icon: Mail,
            permission: PERMISSIONS.MANAGE_USERS,
        },
    ];

    const toggleSidebar = () => setIsOpen(!isOpen);

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        if (!item.permission) return true;
        if (Array.isArray(item.permission)) {
            return item.permission.some(p => hasPermission(p));
        }
        return hasPermission(item.permission);
    });

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md border"
                onClick={toggleSidebar}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full md:translate-x-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col",
                isOpen && "translate-x-0"
            )}>
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">FinX Admin</h1>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Enterprise Panel</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
                    {filteredMenuItems.map((item) => {
                        const isActive = pathname === item.href || (item.submenu?.some(sub => pathname === sub.href));

                        return (
                            <div key={item.title} className="space-y-1">
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                        isActive
                                            ? "bg-primary text-white"
                                            : "hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-4 w-4 shrink-0",
                                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                                    )} />
                                    <span className="flex-1">{item.title}</span>
                                    {item.badge && item.badge > 0 && (
                                        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center animate-pulse">
                                            {item.badge}
                                        </Badge>
                                    )}
                                    {item.submenu && (
                                        <ChevronRight className={cn(
                                            "h-3 w-3 transition-transform",
                                            isActive ? "rotate-90" : ""
                                        )} />
                                    )}
                                </Link>

                                {item.submenu && isActive && (
                                    <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 mt-1">
                                        {item.submenu.map((sub) => (
                                            <Link
                                                key={sub.title}
                                                href={sub.href}
                                                onClick={() => setIsOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                                                    pathname === sub.href
                                                        ? "text-primary bg-primary/5 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]"
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                                )}
                                            >
                                                <sub.icon className="h-3 w-3" />
                                                {sub.title}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-800/30 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                            {admin?.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{admin?.username}</p>
                            <p className="text-[10px] text-slate-500 truncate">{admin?.role}</p>
                        </div>
                    </div>
                    <Button
                        onClick={onLogout}
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-10 gap-3"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                    </Button>
                </div>
            </aside>
        </>
    );
}
