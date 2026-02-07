
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Wallet,
  ArrowLeftRight,
  DollarSign,
  Book,
  Settings,
  ChevronRight,
  X,
  Menu,
  TrendingUp,
  History,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: Home, label: 'Trading', href: '/', key: 'trading' },
  { icon: TrendingUp, label: 'Profit Statistics', href: '/profit-statistics', key: 'profit-statistics' },
  { icon: Wallet, label: 'Wallet', href: '/wallet', key: 'wallet' },
  { icon: History, label: 'Wallet History', href: '/wallet/history', key: 'wallet-history' },
  { icon: DollarSign, label: 'All Transactions', href: '/transactions', key: 'transaction' },
  { icon: Book, label: 'Knowledge Base', href: '/knowledge', key: 'knowledge', expandable: true },
  { icon: Settings, label: 'Profile & KYC', href: '/profile', key: 'profile' },
  { icon: MessageSquare, label: 'Live Support', href: '/chat', key: 'support' },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev =>
      prev.includes(key)
        ? prev.filter((item: any) => item !== key)
        : [...prev, key]
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <h1 className="text-lg sm:text-xl font-bold gradient-text-simple whitespace-nowrap">
              FinX Trading
            </h1>
          </Link>
          <Button
            variant="gradientGhost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {user && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              UID: <span className="gradient-badge font-mono px-3 py-1">{user.uid || '000000'}</span>
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Functions
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isExpanded = expandedItems.includes(item.key);

            return (
              <div key={item.key}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "gradientGhost"}
                    className={cn(
                      "w-full justify-start text-left font-normal transition-all duration-300",
                      isActive && "gradient-active"
                    )}
                    onClick={() => {
                      if (item.expandable) {
                        toggleExpanded(item.key);
                      }
                      setSidebarOpen(false); // Close on mobile
                    }}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.expandable && (
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    )}
                  </Button>
                </Link>

                {/* Expandable submenu */}
                {item.expandable && isExpanded && (
                  <div className="ml-7 mt-1 space-y-1">
                    <Button
                      variant="gradientGhost"
                      size="sm"
                      className="w-full justify-start text-xs text-muted-foreground"
                    >
                      Trading Guides
                    </Button>
                    <Button
                      variant="gradientGhost"
                      size="sm"
                      className="w-full justify-start text-xs text-muted-foreground"
                    >
                      Risk Management
                    </Button>
                    <Button
                      variant="gradientGhost"
                      size="sm"
                      className="w-full justify-start text-xs text-muted-foreground"
                    >
                      FAQ
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:bg-card md:border-r md:z-[100]">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-[100] h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
