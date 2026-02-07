
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  MessageSquare,
  Info,
  CheckCheck,
  Trash2,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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

export function Notifications() {
  const router = useRouter();
  const { setChatModalOpen } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
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
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      setNotifications(prev => prev.map((n: any) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications(prev => prev.filter((n: any) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // For chat notifications, navigate to chat page instead of modal
    if (notification.type === 'chat') {
      router.push('/chat');
      return;
    }

    // For other notifications with links, navigate normally
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <TrendingUp className="h-5 w-5 text-[#00D9C0]" />;
      case 'deposit':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpCircle className="h-5 w-5 text-blue-600" />;
      case 'conversion':
        return <RefreshCw className="h-5 w-5 text-[#00D9C0]" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredNotifications = notifications.filter((n: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.isRead;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          {/* Back Button */}
          <Button
            variant="gradientGhost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Title and Actions */}
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold gradient-text-simple flex items-center">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="self-start sm:self-auto"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Mark all</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Mobile: Horizontal Scrollable Tabs */}
              <div className="mb-6 -mx-4 sm:mx-0">
                <div className="overflow-x-auto hide-scrollbar px-4 sm:px-0">
                  <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 h-auto p-1 gap-1">
                    <TabsTrigger
                      value="all"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="unread"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      Unread
                    </TabsTrigger>
                    <TabsTrigger
                      value="trade"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      Trades
                    </TabsTrigger>
                    <TabsTrigger
                      value="conversion"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      Conversions
                    </TabsTrigger>
                    <TabsTrigger
                      value="deposit"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      Deposits
                    </TabsTrigger>
                    <TabsTrigger
                      value="withdrawal"
                      className="flex-shrink-0 px-4 sm:px-3 whitespace-nowrap data-[state=active]:bg-[#00D9C0] data-[state=active]:text-white"
                    >
                      Withdrawals
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_: any, i: any) => (
                      <Card key={i} className="p-4 animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-muted rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={cn(
                          "transition-all duration-200 hover:shadow-md cursor-pointer",
                          !notification.isRead && "border-l-4 border-l-[#00D9C0] bg-[#00D9C0]/5"
                        )}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="mt-1 flex-shrink-0">
                              {getIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div
                              className="flex-1 min-w-0"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              {/* Title and Badge */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  <h3 className="font-semibold text-sm">
                                    {notification.title}
                                  </h3>
                                  {!notification.isRead && (
                                    <Badge variant="default" className="bg-[#00D9C0] text-white text-xs">
                                      New
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Message */}
                              <p className="text-sm text-muted-foreground mb-2 break-words">
                                {notification.message}
                              </p>

                              {/* Timestamp - Stack on mobile, inline on larger screens */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                                <span className="whitespace-nowrap">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="whitespace-nowrap">
                                  {format(new Date(notification.createdAt), 'MMM dd, yyyy • HH:mm')}
                                </span>
                              </div>
                            </div>

                            {/* Delete Button */}
                            <Button
                              variant="gradientGhost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold mb-2">No notifications</p>
                    <p>You're all caught up! Check back later for updates.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
