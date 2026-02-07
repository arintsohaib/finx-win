
'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminChatDashboard } from './admin-chat-dashboard';
import { cn } from '@/lib/utils';

interface AdminChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminChatModal({ isOpen, onClose }: AdminChatModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className={cn(
                "pointer-events-auto relative flex flex-col",
                "w-full h-auto top-14 bottom-16", // True full-screen
                "bg-background shadow-2xl",
                "animate-in slide-in-from-bottom duration-300",
                "overflow-hidden"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Enterprise Style */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 md:px-8 md:py-5 border-b bg-card shadow-md z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate uppercase">
                      Enterprise Support Console
                    </h2>
                  </div>
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-70 hidden sm:block">
                    Real-time User Communication & Management System
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-muted flex-shrink-0 ml-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Chat Dashboard Content - Takes remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <AdminChatDashboard />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
