
'use client';

import { useEffect, useState } from 'react';
import { Bell, TrendingUp, ArrowDownCircle, ArrowUpCircle, RefreshCw, Info, ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/lib/stores/ui-store';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export function NotificationPanel() {
  const router = useRouter();
  const { setChatModalOpen } = useUIStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      const result = await response.json();

      if (result.success) {
        setUnreadCount(result.unreadCount);
        // Get only the latest 5 notifications for the dropdown
        setNotifications(result.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications(prev =>
        prev.map((n: any) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // For chat notifications (including chat_reopened), navigate to chat page instead of modal
    if (notification.type === 'chat' || notification.type === 'chat_reopened') {
      setIsOpen(false);
      router.push('/chat');
      return;
    }

    // For other notifications with links, navigate normally
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <TrendingUp className="h-4 w-4 text-[#00D9C0]" />;
      case 'deposit':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpCircle className="h-4 w-4 text-blue-600" />;
      case 'conversion':
        return <RefreshCw className="h-4 w-4 text-[#00D9C0]" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'chat_reopened':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="gradientGhost"
          size="sm"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-none sm:rounded-md" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-base">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <Button
            variant="gradientGhost"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="p-2">
              {notifications.map((notification: any, index: any) => (
                <div key={notification.id}>
                  <div
                    className={cn(
                      "p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-[#00D9C0]/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-[#00D9C0] flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be notified about trades, deposits, and more
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="gradientGhost"
            className="w-full justify-center text-sm"
            onClick={handleViewAll}
          >
            View All Notifications
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
