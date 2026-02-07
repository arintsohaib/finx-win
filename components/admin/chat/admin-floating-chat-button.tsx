
'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminFloatingChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AdminFloatingChatButton({ onClick, isOpen }: AdminFloatingChatButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUnreadCount();
    
    // Poll for unread count every 3 seconds for faster response
    const interval = setInterval(fetchUnreadCount, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/chat/sessions', {
        credentials: 'include',
        headers: {
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const totalUnread = data.data.reduce((acc: number, session: any) => {
            return acc + (session.unreadCount || 0);
          }, 0) || 0;
          const waiting = data.data.filter((s: any) => s.status === 'waiting').length || 0;
          setUnreadCount(totalUnread);
          setWaitingCount(waiting);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onClick}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-all duration-300",
          "bg-gradient-to-br from-[#00D9C0] to-[#3B82F6]",
          "hover:scale-110",
          "border-2 border-white/20 backdrop-blur-sm",
          "group relative overflow-hidden",
          isOpen && "rotate-0 scale-95"
        )}
        style={{
          boxShadow: '0 6px 16px -4px rgba(0, 217, 192, 0.4), 0 3px 8px -3px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00F0DB] to-[#60A5FA] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Icon with animation */}
        <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
          {isOpen ? (
            <X className="h-6 w-6 text-white drop-shadow-lg" />
          ) : (
            <MessageSquare className="h-6 w-6 text-white drop-shadow-lg" />
          )}
        </div>

        {/* Unread badge */}
        {!isOpen && (unreadCount > 0 || waitingCount > 0) && (
          <Badge 
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold border-2 border-white animate-pulse p-0 z-20"
          >
            {(unreadCount + waitingCount) > 9 ? '9+' : (unreadCount + waitingCount)}
          </Badge>
        )}

        {/* Ping animation for unread messages or waiting chats */}
        {!isOpen && (unreadCount > 0 || waitingCount > 0) && (
          <span className="absolute top-0 right-0 flex h-3 w-3 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </Button>

      {/* Enhanced Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="font-semibold">Live Chat Support</div>
            {(waitingCount > 0 || unreadCount > 0) && (
              <div className="mt-1 text-xs">
                {waitingCount > 0 && (
                  <span className="text-yellow-400 font-semibold">
                    {waitingCount} waiting
                  </span>
                )}
                {waitingCount > 0 && unreadCount > 0 && <span className="mx-1">•</span>}
                {unreadCount > 0 && (
                  <span className="text-green-400 font-semibold">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
