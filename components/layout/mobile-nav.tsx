
'use client';

import { Home, Wallet, TrendingUp, User, ArrowLeftRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navItems = [
    { icon: Home, label: 'Home', href: '/', key: 'home' },
    { icon: Wallet, label: 'Wallet', href: '/wallet', key: 'wallet' },
    { icon: TrendingUp, label: 'Stats', href: '/profit-statistics', key: 'stats' },
    { icon: User, label: 'Profile', href: '/profile', key: 'profile' },
];

export function MobileNav() {
    const pathname = usePathname();

    // Don't show on admin routes
    if (pathname.startsWith('/admin')) return null;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] glass-morphism border-t bg-background/60 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-colors",
                                isActive && "bg-primary/10"
                            )}>
                                <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                            </div>
                            <span className={cn(
                                "text-[10px] mt-0.5 font-medium",
                                isActive && "font-bold"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
