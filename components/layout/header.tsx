
'use client';

import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu } from 'lucide-react';
import { useUIStore } from '@/lib/stores/ui-store';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export function Header() {
  const { setSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-[100] w-full glass-morphism border-b bg-background/60 backdrop-blur-xl">
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 gap-2">
        {/* Left: Profile Indicator */}
        <div className="flex items-center space-x-3">
          {/* Menu Button for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden h-9 w-9 rounded-full bg-secondary/30 hover:bg-secondary/50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
          <Link href="/" className="flex flex-col">
            <h1 className="text-sm font-bold gradient-text-simple leading-tight">FinX Trading Platform</h1>
            <p className="text-[9px] text-muted-foreground leading-tight px-0.5 tracking-tighter uppercase font-medium">One Platform for All Your Needs</p>
          </Link>
        </div>

        {/* Right: Theme Toggle + Notification Bell */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full bg-secondary/30 hover:bg-secondary/50 transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <NotificationPanel />
        </div>
      </div>
    </header>
  );
}
