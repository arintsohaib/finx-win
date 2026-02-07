
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter, usePathname } from 'next/navigation';

export function FloatingChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Check for unread messages periodically (only when logged in)
  useEffect(() => {
    if (!user?.walletAddress) return;

    const checkUnreadMessages = async () => {
      try {
        const response = await fetch('/api/chat/unread-count', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const newUnread = data.unreadCount || 0;

          // If unread count increased, show animation
          if (newUnread > unreadCount) {
            setHasNewMessage(true);
            setTimeout(() => setHasNewMessage(false), 3000);
          }

          setUnreadCount(newUnread);
        }
      } catch (error) {
        console.error('Error checking unread messages:', error);
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 3000);

    return () => clearInterval(interval);
  }, [unreadCount, user?.walletAddress]);

  // Only show chat button when user is logged in (on dashboard)
  if (!user?.walletAddress) {
    return null;
  }

  // Hide floating button on the chat page itself
  if (pathname === '/chat') {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="fixed right-4 z-30 bottom-24 md:bottom-8 md:right-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => router.push('/chat')}
              size="icon"
              className={cn(
                "h-14 w-14 rounded-2xl shadow-2xl transition-all duration-500",
                "bg-gradient-to-br from-[#00D9C0] to-[#3B82F6]",
                "hover:scale-110 hover:rotate-3 hover:shadow-[#00D9C0]/30",
                "relative group overflow-hidden border-2 border-white/10",
                hasNewMessage && "animate-bounce"
              )}
              aria-label="Open chat"
            >
              {/* Pulse ring for new messages (behind everything) */}
              {hasNewMessage && (
                <div className="absolute inset-0 rounded-full bg-[#00D9C0] animate-ping opacity-75 z-0" />
              )}

              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00F0DB] to-[#60A5FA] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />

              {/* Icon Container - Always on top */}
              <div className="relative z-[20] flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white drop-shadow-md" strokeWidth={2.5} />
              </div>

              {/* Unread Badge - Above everything */}
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-2xl bg-rose-500 border-4 border-background flex items-center justify-center animate-pulse z-[25] shadow-lg">
                  <span className="text-[10px] font-black text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="glass-card border-white/10 shadow-2xl px-4 py-2">
            <p className="text-xs font-black uppercase tracking-widest text-foreground">
              {unreadCount > 0 ? `${unreadCount} New Messages` : 'Live Support'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
