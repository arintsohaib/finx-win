'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  MessageCircle,
  User,
  Send,
  Camera,
  RotateCcw,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  AlertCircle,
  Wallet,
  TrendingUp,
  ExternalLink,
  ChevronLeft,
  FileText,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatSession {
  id: string;
  walletAddress: string;
  assignedAdminId: string | null;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  messages?: ChatMessage[];
  user?: {
    uid: string;
    walletAddress: string;
    fullName?: string | null;
    email?: string | null;
    kycStatus?: string;
    balances?: any[];
    trades?: any[];
  };
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  walletAddress: string | null;
  adminId: string | null;
  senderType: 'user' | 'admin';
  message: string;
  messageType: string;
  fileUrl: string | null;
  fileName: string | null;
  isRead: boolean;
  createdAt: string;
}

interface QuickReply {
  id: string;
  title: string;
  message: string;
  category: string;
}

export function AdminChatDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'users' | 'chat' | 'info'>('users');
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [infoVisible, setInfoVisible] = useState(true);

  const fileInputRef = useRef<any>(null);

  const messagesEndRef = useRef<any>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Auth token automatically sent via httpOnly cookie
  // No need for manual headers - credentials: 'include' handles it
  const getAuthHeaders = (): Record<string, string> => {
    return {}; // Empty - cookie handles authentication
  };

  useEffect(() => {
    fetchAdminInfo();
    fetchSessions();
    fetchQuickReplies();

    // Real-time polling every 1 second for instant updates
    pollingInterval.current = setInterval(() => {
      fetchSessions(true);
      if (selectedSession) {
        fetchMessages(selectedSession.id, true);
      }
    }, 1000);

    // Send heartbeat every 10 seconds to mark admin as online
    heartbeatInterval.current = setInterval(() => {
      sendHeartbeat();
    }, 10000);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
      fetchUserInfo(selectedSession.walletAddress);
    }
  }, [selectedSession?.id]);


  useEffect(() => {
    // Only auto-scroll if it's the first load or if we want to force it
    if (messages.length > 0 && selectedSession) {
      // We'll let ChatPanel handle the smart scrolling
    }
  }, [selectedSession?.id]);

  const fetchAdminInfo = async () => {
    try {
      const response = await fetch('/api/admin/me', {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        setAdminInfo(result.admin);
      }
    } catch (error) {
      console.error('Failed to fetch admin info:', error);
    }
  };

  const sendHeartbeat = async () => {
    try {
      await fetch('/api/admin/heartbeat', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  };

  const fetchSessions = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);

      const params = new URLSearchParams({
        status: statusFilter === 'all' ? '' : statusFilter,
      });

      const response = await fetch(`/api/admin/chat/sessions?${params}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setSessions(result.data);

        // Auto-select first session if none selected
        if (!selectedSession && result.data.length > 0) {
          setSelectedSession(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      if (!silent) toast.error('Failed to load chat sessions');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string, silent: boolean = false) => {
    try {
      const response = await fetch(`/api/admin/chat/sessions/${sessionId}/messages`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (!silent) toast.error('Failed to load messages');
    }
  };

  const fetchUserInfo = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/admin/users/info?walletAddress=${walletAddress}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setUserInfo(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await fetch('/api/admin/chat/quick-replies', {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setQuickReplies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch quick replies:', error);
    }
  };

  const handleSendMessage = async (customBody?: any) => {
    if (!customBody && !newMessage.trim()) return;
    if (!selectedSession) return;

    const messageToSend = customBody ? '' : newMessage.trim();
    if (!customBody) setNewMessage('');
    setIsSending(true);

    try {
      console.log('[Admin Chat] Sending message to session:', selectedSession.id);

      const body = customBody || {
        sessionId: selectedSession.id,
        message: messageToSend,
        messageType: 'text',
        fileUrl: null,
        fileName: null,
      };

      const response = await fetch('/api/admin/chat/send-message', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log('[Admin Chat] Send response:', result);

      if (result.success) {
        setMessages((prev) => [...prev, result.data]);
        await fetchSessions(true); // Update session list
        if (!customBody) toast.success('Message sent!');
      } else {
        toast.error('Failed to send message');
        if (!customBody && messageToSend) setNewMessage(messageToSend);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      if (!customBody && messageToSend) setNewMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPG, PNG, WebP, GIF) are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        // Send message with image
        await handleSendMessage({
          sessionId: selectedSession.id,
          message: '',
          messageType: 'image',
          fileUrl: result.fileUrl,
          fileName: result.fileName,
        });

        toast.success('Image uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedSession || !adminInfo) return;

    try {
      const response = await fetch(`/api/admin/chat/sessions/${selectedSession.id}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ adminId: adminInfo.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chat assigned to you');
        setSelectedSession({ ...selectedSession, assignedAdminId: adminInfo.id, status: 'active' });
        fetchSessions(true);
      } else {
        toast.error('Failed to assign chat');
      }
    } catch (error) {
      console.error('Failed to assign chat:', error);
      toast.error('Failed to assign chat');
    }
  };

  const handleCloseChat = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(`/api/admin/chat/sessions/${selectedSession.id}/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chat closed successfully');
        // Update the selected session status to closed (keeps it visible)
        setSelectedSession({ ...selectedSession, status: 'closed' });
        // Switch to "all" filter to ensure closed session remains in the list
        setStatusFilter('all');
        fetchSessions(true);
      } else {
        toast.error('Failed to close chat');
      }
    } catch (error) {
      console.error('Failed to close chat:', error);
      toast.error('Failed to close chat');
    }
  };

  const handleReopenChat = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(`/api/admin/chat/sessions/${selectedSession.id}/reopen`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chat reopened successfully! User will be notified.');
        setSelectedSession({ ...selectedSession, status: 'active', assignedAdminId: adminInfo?.id || null });
        fetchSessions(true);
      } else {
        toast.error(result.error || 'Failed to reopen chat');
      }
    } catch (error) {
      console.error('Failed to reopen chat:', error);
      toast.error('Failed to reopen chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setNewMessage(reply.message);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Group messages by sender and time (like Facebook Messenger)
  const groupMessages = (messages: ChatMessage[]) => {
    if (messages.length === 0) return [];

    const groups: Array<{
      senderType: 'user' | 'admin';
      messages: ChatMessage[];
      date: string;
    }> = [];

    let currentGroup: ChatMessage[] = [];
    let currentSender: 'user' | 'admin' | null = null;
    let currentDate: string | null = null;

    messages.forEach((msg: any, index: any) => {
      const msgDate = format(new Date(msg.createdAt), 'MMMM dd, yyyy');
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const timeDiff = prevMsg
        ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
        : 0;

      // Start new group if:
      // 1. Different sender
      // 2. Different date
      // 3. More than 2 minutes between messages
      const shouldStartNewGroup =
        !currentSender ||
        msg.senderType !== currentSender ||
        msgDate !== currentDate ||
        timeDiff > 2 * 60 * 1000; // 2 minutes

      if (shouldStartNewGroup) {
        if (currentGroup.length > 0 && currentSender && currentDate) {
          groups.push({
            senderType: currentSender,
            messages: currentGroup,
            date: currentDate,
          });
        }
        currentGroup = [msg];
        currentSender = msg.senderType;
        currentDate = msgDate;
      } else {
        currentGroup.push(msg);
      }

      // Add last group
      if (index === messages.length - 1) {
        groups.push({
          senderType: currentSender!,
          messages: currentGroup,
          date: currentDate!,
        });
      }
    });

    return groups;
  };

  const messageGroups = groupMessages(messages);

  const filteredSessions = sessions.filter((session: any) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      session.walletAddress.toLowerCase().includes(query) ||
      session.user?.uid.toLowerCase().includes(query) ||
      session.user?.fullName?.toLowerCase().includes(query) ||
      session.user?.email?.toLowerCase().includes(query) ||
      session.user?.kycStatus?.toLowerCase().includes(query); // Added KYC status search
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: { color: 'bg-yellow-500', label: 'Waiting' },
      active: { color: 'bg-green-500', label: 'Active' },
      closed: { color: 'bg-gray-500', label: 'Closed' },
    };
    const variant = variants[status as keyof typeof variants] || variants.waiting;
    return (
      <Badge variant="outline" className={cn("text-xs", variant.color, "text-white")}>
        {variant.label}
      </Badge>
    );
  };

  const stats = {
    waiting: sessions.filter((s: any) => s.status === 'waiting').length,
    active: sessions.filter((s: any) => s.status === 'active').length,
    myChats: sessions.filter((s: any) => s.assignedAdminId === adminInfo?.id && s.status !== 'closed').length,
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* ===== MOBILE VIEW (< 768px) ===== */}
      <div className="md:hidden h-full flex flex-col">
        {/* Mobile Navigation Tabs - Enterprise Style */}
        <div className="flex-shrink-0 flex items-center border-b bg-card h-14 sticky top-0 z-10 shadow-sm px-2 gap-2">
          <button
            onClick={() => setMobileView('users')}
            className={cn(
              "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300",
              mobileView === 'users'
                ? "bg-[#00D9C0]/10 text-[#00D9C0] font-black uppercase tracking-tighter text-xs"
                : "text-muted-foreground hover:bg-muted/50 font-bold uppercase tracking-tighter text-xs"
            )}
          >
            <User className={cn("h-4 w-4", mobileView === 'users' && "animate-pulse")} />
            <span>Feed</span>
          </button>
          <button
            onClick={() => setMobileView('chat')}
            disabled={!selectedSession}
            className={cn(
              "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 relative",
              mobileView === 'chat'
                ? "bg-[#00D9C0]/10 text-[#00D9C0] font-black uppercase tracking-tighter text-xs"
                : "text-muted-foreground hover:bg-muted/50 font-bold uppercase tracking-tighter text-xs",
              !selectedSession && "opacity-30 grayscale cursor-not-allowed"
            )}
          >
            <MessageCircle className={cn("h-4 w-4", mobileView === 'chat' && "animate-pulse")} />
            <span>Chat</span>
            {selectedSession?.unreadCount ? selectedSession.unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-2 right-1/2 ml-4" />
            ) : null}
          </button>
          <button
            onClick={() => setMobileView('info')}
            disabled={!selectedSession || !userInfo}
            className={cn(
              "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300",
              mobileView === 'info'
                ? "bg-[#00D9C0]/10 text-[#00D9C0] font-black uppercase tracking-tighter text-xs"
                : "text-muted-foreground hover:bg-muted/50 font-bold uppercase tracking-tighter text-xs",
              (!selectedSession || !userInfo) && "opacity-30 grayscale cursor-not-allowed"
            )}
          >
            <FileText className={cn("h-4 w-4", mobileView === 'info' && "animate-pulse")} />
            <span>Info</span>
          </button>
        </div>

        {/* Mobile Content Panels */}
        <div className="flex-1 overflow-hidden relative">
          {/* Users Panel */}
          {mobileView === 'users' && (
            <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-left duration-200">
              <MobileUsersList
                sessions={sessions}
                filteredSessions={filteredSessions}
                selectedSession={selectedSession}
                isLoading={isLoading}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                stats={stats}
                setSearchQuery={setSearchQuery}
                setStatusFilter={setStatusFilter}
                setSelectedSession={(session: ChatSession) => {
                  setSelectedSession(session);
                  setSessions((prev: ChatSession[]) =>
                    prev.map((s: ChatSession) =>
                      s.id === session.id
                        ? { ...s, lastMessageAt: new Date().toISOString(), status: 'active' }
                        : s
                    )
                  );
                  setMobileView('chat');
                }}
                getStatusBadge={getStatusBadge}
              />
            </div>
          )}

          {/* Chat Panel */}
          {mobileView === 'chat' && selectedSession && (
            <div className="absolute inset-0 flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              {/* Mobile Back Button in Chat */}
              <div className="flex-shrink-0 flex items-center gap-2 p-2 border-b bg-background md:hidden">
                <Button variant="ghost" size="sm" onClick={() => setMobileView('users')} className="h-8 px-2 text-xs">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="flex-1 min-w-0 px-2">
                  <p className="text-xs font-bold truncate uppercase tracking-tighter">
                    {selectedSession.user?.fullName || `UID: ${userInfo?.uid || '...'}`}
                  </p>
                </div>
              </div>
              <ChatPanel
                selectedSession={selectedSession}
                messages={messages}
                messageGroups={messageGroups}
                newMessage={newMessage}
                isSending={isSending}
                quickReplies={quickReplies}
                userInfo={userInfo}
                messagesEndRef={messagesEndRef}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                handleKeyPress={handleKeyPress}
                handleAssignToMe={handleAssignToMe}
                handleCloseChat={handleCloseChat}
                handleReopenChat={handleReopenChat}
                handleQuickReply={handleQuickReply}
                getStatusBadge={getStatusBadge}
                adminInfo={adminInfo}
                isMobile={true}
                fileInputRef={fileInputRef}
                isUploading={isUploading}
                handleFileUpload={handleFileUpload}
              />
            </div>
          )}

          {/* Info Panel */}
          {mobileView === 'info' && selectedSession && userInfo && (
            <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-right duration-300 overflow-y-auto overscroll-contain bg-background">
              <div className="flex-shrink-0 flex items-center p-2 border-b bg-background md:hidden">
                <Button variant="ghost" size="sm" onClick={() => setMobileView('chat')} className="h-8 px-2 text-xs">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Chat
                </Button>
              </div>
              <CustomerInfoPanel selectedSession={selectedSession} userInfo={userInfo} />
            </div>
          )}
        </div>
      </div>

      {/* ===== DESKTOP VIEW (≥ 768px) ===== */}
      <div className="hidden md:flex h-full overflow-hidden bg-background">
        {/* Left Sidebar - Users List */}
        <div
          className={cn(
            "border-r bg-muted/30 flex flex-col transition-all duration-300 ease-in-out relative group",
            sidebarVisible ? "w-[350px]" : "w-0 border-r-0"
          )}
        >

          <div className={cn("flex flex-col h-full w-[350px] overflow-hidden", !sidebarVisible && "opacity-0 invisible")}>
            <div className="flex-shrink-0 p-4 border-b bg-background">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2 tracking-tighter uppercase italic">
                <MessageCircle className="h-6 w-6 text-[#00D9C0]" />
                Live Feed
              </h2>

              {/* Stats - Compact & Professional */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                  <div className="text-xl font-black text-yellow-600 leading-none">{stats.waiting}</div>
                  <div className="text-[10px] font-bold text-yellow-600/70 uppercase tracking-tighter">Queue</div>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-xl font-black text-green-600 leading-none">{stats.active}</div>
                  <div className="text-[10px] font-bold text-green-600/70 uppercase tracking-tighter">Live</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-xl font-black text-blue-600 leading-none">{stats.myChats}</div>
                  <div className="text-[10px] font-bold text-blue-600/70 uppercase tracking-tighter">Mine</div>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Quick search user..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-[#00D9C0]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm h-10 bg-muted/50 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Global (All)</SelectItem>
                    <SelectItem value="waiting">Waiting Only</SelectItem>
                    <SelectItem value="active">Active Conversations</SelectItem>
                    <SelectItem value="closed">Historical Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sessions List - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00D9C0]" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-40">No Sessions</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "group/card cursor-pointer rounded-xl border p-3 transition-all duration-200 relative overflow-hidden",
                        selectedSession?.id === session.id
                          ? "bg-gradient-to-r from-[#00D9C0]/10 to-transparent border-[#00D9C0] shadow-sm"
                          : "bg-background hover:bg-muted/50 border-transparent hover:border-border"
                      )}
                      onClick={() => {
                        setSelectedSession(session);
                        setSessions((prev: ChatSession[]) =>
                          prev.map((s: ChatSession) =>
                            s.id === session.id
                              ? { ...s, lastMessageAt: new Date().toISOString(), status: 'active' }
                              : s
                          )
                        );
                      }}
                    >
                      {/* Selection Indicator */}
                      {selectedSession?.id === session.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00D9C0]" />
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-background shadow-inner">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm truncate uppercase tracking-tight">
                              {session.user?.fullName || `UID: ${session.user?.uid || 'N/A'}`}
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground/60 truncate uppercase tracking-tight">
                              {session.user?.email || `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}`}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {session.unreadCount && session.unreadCount > 0 ? (
                            <Badge className="bg-[#00D9C0] text-white text-[10px] h-4 px-1.5 font-black uppercase ring-2 ring-white dark:ring-zinc-950">
                              {session.unreadCount} New
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/40 flex items-center gap-1 uppercase tracking-tighter">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.lastMessageAt), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        {session.assignedAdminId && (
                          <div className="flex items-center gap-1.5 bg-[#00D9C0]/10 px-1.5 py-0.5 rounded-full border border-[#00D9C0]/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00D9C0] animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#00D9C0]">Reserved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Chat Panel */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden relative shadow-inner">

          {selectedSession ? (
            <ChatPanel
              selectedSession={selectedSession}
              messages={messages}
              messageGroups={messageGroups}
              newMessage={newMessage}
              isSending={isSending}
              quickReplies={quickReplies}
              userInfo={userInfo}
              messagesEndRef={messagesEndRef}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              handleAssignToMe={handleAssignToMe}
              handleCloseChat={handleCloseChat}
              handleReopenChat={handleReopenChat}
              handleQuickReply={handleQuickReply}
              getStatusBadge={getStatusBadge}
              adminInfo={adminInfo}
              isMobile={false}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              handleFileUpload={handleFileUpload}
              sidebarVisible={sidebarVisible}
              setSidebarVisible={setSidebarVisible}
              infoVisible={infoVisible}
              setInfoVisible={setInfoVisible}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500 px-10 text-center">
              <div className="w-24 h-24 rounded-3xl bg-muted/30 flex items-center justify-center mb-6 border border-border/50 shadow-inner">
                <MessageCircle className="h-12 w-12 opacity-20" />
              </div>
              <p className="text-xl font-black uppercase tracking-widest mb-2">Command Center Offline</p>
              <p className="text-sm font-medium opacity-50 max-w-xs uppercase tracking-tight">Select a transmission from the live feed to begin communication</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Customer Info */}
        <div
          className={cn(
            "border-l bg-muted/20 flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-full",
            infoVisible ? "w-[400px]" : "w-0 border-l-0"
          )}
        >
          <div className="flex flex-col h-full w-[400px] overflow-hidden overscroll-contain">
            {selectedSession && userInfo ? (
              <CustomerInfoPanel selectedSession={selectedSession} userInfo={userInfo} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground opacity-30">
                <User className="h-16 w-16 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">Profile Target Locked</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== MOBILE USERS LIST COMPONENT ==========
interface MobileUsersListProps {
  sessions: ChatSession[];
  filteredSessions: ChatSession[];
  selectedSession: ChatSession | null;
  isLoading: boolean;
  searchQuery: string;
  statusFilter: string;
  stats: { waiting: number; active: number; myChats: number };
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedSession: (session: ChatSession) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function MobileUsersList({
  sessions,
  filteredSessions,
  selectedSession,
  isLoading,
  searchQuery,
  statusFilter,
  stats,
  setSearchQuery,
  setStatusFilter,
  setSelectedSession,
  getStatusBadge,
}: MobileUsersListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b bg-background space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2 text-center">
            <div className="text-xl font-bold text-yellow-500">{stats.waiting}</div>
            <div className="text-xs text-muted-foreground">Waiting</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-xl font-bold text-green-500">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-xl font-bold text-[#00D9C0]">{stats.myChats}</div>
            <div className="text-xs text-muted-foreground">My Chats</div>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sessions List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No chat sessions found</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedSession?.id === session.id && "bg-[#00D9C0]/10 border-[#00D9C0]"
                )}
                onClick={() => setSelectedSession(session)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#00D9C0]/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-[#00D9C0]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {session.user?.fullName || `UID: ${session.user?.uid || 'N/A'}`}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {session.user?.email || `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}`}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  {session.unreadCount && session.unreadCount > 0 && (
                    <Badge variant="default" className="bg-red-500 text-white text-xs mb-2">
                      {session.unreadCount} new
                    </Badge>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.lastMessageAt), 'HH:mm')}
                    </span>
                    {session.assignedAdminId && (
                      <span className="text-[#00D9C0]">Assigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== CHAT PANEL COMPONENT ==========
interface ChatPanelProps {
  selectedSession: ChatSession;
  messages: ChatMessage[];
  messageGroups: any[];
  newMessage: string;
  isSending: boolean;
  quickReplies: QuickReply[];
  userInfo: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleAssignToMe: () => void;
  handleCloseChat: () => void;
  handleReopenChat: () => void;
  handleQuickReply: (reply: QuickReply) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  adminInfo: any;
  isMobile: boolean;
  sidebarVisible?: boolean;
  setSidebarVisible?: (visible: boolean) => void;
  infoVisible?: boolean;
  setInfoVisible?: (visible: boolean) => void;
}

function ChatPanel({
  selectedSession,
  messages,
  messageGroups,
  newMessage,
  isSending,
  quickReplies,
  userInfo,
  messagesEndRef,
  fileInputRef,
  isUploading,
  setNewMessage,
  handleSendMessage,
  handleFileUpload,
  handleKeyPress,
  handleAssignToMe,
  handleCloseChat,
  handleReopenChat,
  handleQuickReply,
  getStatusBadge,
  adminInfo,
  isMobile,
  sidebarVisible,
  setSidebarVisible,
  infoVisible,
  setInfoVisible,
}: ChatPanelProps) {
  return (
    <>
      {/* Chat Header - Fixed (Desktop Only) */}
      {!isMobile && (
        <div className="flex-shrink-0 p-4 border-b flex items-center justify-between bg-muted/30 gap-12">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Left Sidebar Toggle - Only on Desktop */}
            {!isMobile && setSidebarVisible && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarVisible(!sidebarVisible)}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all duration-200 mr-1",
                        sidebarVisible ? "text-[#00D9C0] bg-[#00D9C0]/10 hover:bg-[#00D9C0]/20" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {sidebarVisible ? (
                        <PanelLeftClose className="h-4 w-4" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sidebarVisible ? 'Hide Live Feed' : 'Show Live Feed'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00D9C0]/20 to-transparent flex items-center justify-center flex-shrink-0 border border-[#00D9C0]/20 shadow-inner">
              <User className="h-5 w-5 text-[#00D9C0]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="font-black text-base truncate uppercase tracking-tighter">
                  {selectedSession.user?.fullName || `UID: ${userInfo?.uid || 'Loading...'}`}
                </div>
                {getStatusBadge(selectedSession.status)}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground/60 truncate uppercase tracking-[0.1em]">
                {selectedSession.user?.email || `${selectedSession.walletAddress.slice(0, 10)}...${selectedSession.walletAddress.slice(-8)}`}
              </div>
            </div>
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-4 flex-shrink-0">
              {selectedSession.status === 'waiting' && !selectedSession.assignedAdminId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={handleAssignToMe} className="bg-[#00D9C0] hover:bg-[#00C0AA]">
                      <User className="h-4 w-4 mr-2" />
                      Assign to Me
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Take ownership of this chat</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {selectedSession.status === 'closed' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={handleReopenChat} className="border-green-500 text-green-600">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reopen
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reopen this chat</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <X className="h-4 w-4 mr-2" />
                          Close
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark as resolved</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Close this conversation?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        Are you sure you want to mark this chat as <strong>resolved</strong>?
                        <br /><br />
                        This will archive the session, but you can always reopen it later if the customer returns.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Chat Open</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCloseChat}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Mark as Resolved
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Sidebar Toggle - Only on Desktop */}
              {!isMobile && setInfoVisible && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInfoVisible(!infoVisible)}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all duration-200",
                        infoVisible ? "text-[#00D9C0] bg-[#00D9C0]/10 hover:bg-[#00D9C0]/20" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {infoVisible ? (
                        <PanelRightClose className="h-4 w-4" />
                      ) : (
                        <PanelRightOpen className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{infoVisible ? 'Hide Customer Info' : 'Show Customer Info'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 md:p-4 min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain bg-background/50 shadow-inner"
              onScroll={(e: React.UIEvent<HTMLDivElement>) => {
                const target = e.currentTarget;
                const isBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 50;
                (target as any)._isAtBottom = isBottom;
              }}
              ref={(el: HTMLDivElement | null) => {
                if (el && (el as any)._isAtBottom === undefined) {
                  (el as any)._isAtBottom = true;
                }
                // Trigger scroll to bottom on first mount or when messages change IF we were at bottom
                if (el && (el as any)._isAtBottom) {
                  setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                  }, 0);
                }
              }}
            >
              {messageGroups.map((group: any, groupIndex: any) => {
                const isAdmin = group.senderType === 'admin';
                const showDateDivider = groupIndex === 0 || group.date !== messageGroups[groupIndex - 1].date;

                return (
                  <div key={`group-${groupIndex}`}>
                    {/* Date Divider */}
                    {showDateDivider && (
                      <div className="flex items-center justify-center my-6">
                        <div className="bg-muted/50 border border-border/40 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 shadow-sm backdrop-blur-sm">
                          {group.date}
                        </div>
                      </div>
                    )}

                    {/* Message Group */}
                    <div className={cn('flex gap-3 mb-2', isAdmin ? 'justify-end' : 'justify-start')}>
                      {/* Avatar (only for user) */}
                      {!isAdmin && (
                        <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-background">
                          <User className="h-5 w-5" />
                        </div>
                      )}

                      {/* Messages in Group */}
                      <div className={cn('flex flex-col max-w-[85%] sm:max-w-[75%]', isAdmin ? 'items-end' : 'items-start')}>
                        {/* Sender Name (only on first message) */}
                        {!isAdmin && (
                          <span className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                            {userInfo?.uid || 'User'}
                          </span>
                        )}

                        {/* Individual Messages */}
                        <div className={cn('flex flex-col gap-1 w-full', isAdmin ? 'items-end' : 'items-start')}>
                          {group.messages.map((msg: ChatMessage, msgIndex: number) => {
                            const isFirstInGroup = msgIndex === 0;
                            const isLastInGroup = msgIndex === group.messages.length - 1;
                            const isImage = msg.messageType === 'image';
                            const isFile = msg.messageType === 'file';

                            return (
                              <div
                                key={msg.id}
                                className={cn(
                                  'px-4 py-3 shadow-md break-words transition-all duration-300 relative group/msg',
                                  'border border-border/10',
                                  isAdmin
                                    ? 'bg-gradient-to-br from-[#00D9C0] to-[#00BF90] text-white font-bold tracking-tight shadow-[#00D9C0]/10'
                                    : 'bg-white dark:bg-zinc-900 border-border/30 hover:border-border/60 text-foreground/90 shadow-sm',
                                  isAdmin ? (
                                    cn(
                                      'rounded-2xl',
                                      isFirstInGroup && 'rounded-tr-sm',
                                      isLastInGroup && 'rounded-br-sm'
                                    )
                                  ) : (
                                    cn(
                                      'rounded-2xl',
                                      isFirstInGroup && 'rounded-tl-sm',
                                      isLastInGroup && 'rounded-bl-sm'
                                    )
                                  )
                                )}
                              >
                                {/* Image Attachment */}
                                {isImage && msg.fileUrl && (
                                  <div className="mb-2 rounded-xl overflow-hidden relative aspect-video bg-black/10 cursor-zoom-in group/img border border-white/10">
                                    <ImageLightbox
                                      src={msg.fileUrl}
                                      alt={msg.fileName || 'Image'}
                                      trigger={
                                        <div className="relative w-full h-full">
                                          <Image
                                            src={msg.fileUrl}
                                            alt={msg.fileName || 'Image'}
                                            fill
                                            className="object-contain"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                                        </div>
                                      }
                                    />
                                  </div>
                                )}

                                {/* File Attachment */}
                                {isFile && msg.fileUrl && (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl mb-2 transition-all",
                                      isAdmin
                                        ? "bg-white/15 hover:bg-white/25 border border-white/10"
                                        : "bg-muted hover:bg-muted/80 border border-border/40"
                                    )}
                                  >
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isAdmin ? "bg-white/20" : "bg-background")}>
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">{msg.fileName}</p>
                                      <p className="text-[10px] opacity-60 uppercase font-black tracking-tighter">Download File</p>
                                    </div>
                                    <Download className="h-4 w-4 opacity-50" />
                                  </a>
                                )}

                                {/* Text Message */}
                                {msg.message && (
                                  <p className="text-[13.5px] md:text-[14.5px] whitespace-pre-wrap leading-relaxed tracking-tight">
                                    {msg.message}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Timestamp */}
                        <div className={cn('flex items-center gap-1.5 mt-1.5 px-2 opacity-40 group-hover/msg:opacity-100 transition-opacity', isAdmin ? 'flex-row-reverse' : 'flex-row')}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {format(new Date(group.messages[group.messages.length - 1].createdAt), 'HH:mm')}
                          </span>
                          {isAdmin && group.messages[group.messages.length - 1].isRead && (
                            <div className="flex items-center">
                              <CheckCheck className="h-3 w-3 text-[#00D9C0]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef as any} className="h-1" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Replies - Fixed */}
      {quickReplies.length > 0 && selectedSession.status !== 'closed' && (
        <div className="flex-shrink-0 border-t p-2 bg-muted/30">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {quickReplies.slice(0, 5).map((reply) => (
              <Button
                key={reply.id}
                size="sm"
                variant="outline"
                onClick={() => handleQuickReply(reply)}
                className="flex-shrink-0 text-xs"
              >
                {reply.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - Fixed */}
      {selectedSession.status !== 'closed' && (
        <div className="flex-shrink-0 border-t p-3 md:p-4">
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
              className="text-muted-foreground hover:text-[#00D9C0] hover:bg-[#00D9C0]/10 flex-shrink-0"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>

            <Textarea
              value={newMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!newMessage.trim() || isSending}
              className="bg-[#00D9C0] hover:bg-[#00C0AA] text-white flex-shrink-0"
              size="icon"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ========== CUSTOMER INFO PANEL COMPONENT ==========
interface CustomerInfoPanelProps {
  selectedSession: ChatSession;
  userInfo: any;
}

function CustomerInfoPanel({ selectedSession, userInfo }: CustomerInfoPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      <div className="flex-shrink-0 p-4 border-b bg-card shadow-sm flex items-center justify-between">
        <h3 className="font-black text-xs uppercase tracking-widest text-[#00D9C0]">Customer Dossier</h3>
        {userInfo?.uid && (
          <Link href={`/admin/users/${userInfo.uid}`} target="_blank">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[#00D9C0]/10 hover:text-[#00D9C0] transition-all">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User Stats/Quick Look */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-2xl p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-tighter mb-1">Status</p>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                selectedSession.user?.kycStatus === 'approved' ? "bg-green-500" : "bg-zinc-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {selectedSession.user?.kycStatus === 'approved' ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
          <div className="bg-card border rounded-2xl p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-tighter mb-1">UID</p>
            <p className="text-[10px] font-black uppercase tracking-widest font-mono truncate">{userInfo.uid}</p>
          </div>
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <User className="h-3 w-3" />
              Identity Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-card border rounded-2xl shadow-sm space-y-3">
            {selectedSession.user?.fullName && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight">Full Name</span>
                <span className="text-xs font-black uppercase tracking-tight text-right truncate">{selectedSession.user.fullName}</span>
              </div>
            )}
            {selectedSession.user?.email && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight">Access Email</span>
                <span className="text-[10px] font-black uppercase tracking-tight text-right truncate text-[#00D9C0]">{selectedSession.user.email}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2 pt-1 border-t border-dashed">
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight">Protocol Wallet</span>
              <span className="text-[9px] font-mono text-muted-foreground break-all text-right max-w-[150px]">{userInfo.walletAddress}</span>
            </div>
            <div className="flex justify-between items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight">Origin Date</span>
              <span className="text-[10px] font-black uppercase tracking-tight">{format(new Date(userInfo.createdAt), 'MMM dd, yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <Wallet className="h-3 w-3" />
              Liquidity Centers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-card border rounded-2xl shadow-sm">
            {userInfo.balances && userInfo.balances.length > 0 ? (
              <div className="space-y-3">
                {userInfo.balances.slice(0, 5).map((balance: any) => (
                  <div key={balance.currency} className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{balance.currency}</span>
                    <span className="text-xs font-mono font-black text-[#00D9C0] tracking-tighter">
                      {parseFloat(balance.amount).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest">No Active Assets</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Recent Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-card border rounded-2xl shadow-sm">
            {userInfo.trades && userInfo.trades.length > 0 ? (
              <div className="space-y-4">
                {userInfo.trades.slice(0, 3).map((trade: any) => (
                  <div key={trade.id} className="flex justify-between items-center group">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">{trade.asset}</div>
                      <div className="text-[10px] font-bold text-muted-foreground/50 tracking-tighter">
                        ${parseFloat(trade.amountUsd).toFixed(2)} Vol
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-2 h-5 tracking-[0.1em]",
                      trade.result === 'win'
                        ? "bg-[#00D9C0]/10 text-[#00D9C0] border-[#00D9C0]/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )} variant="outline">
                      {trade.result}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest">No Recent Ops</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border-t bg-card/50">
        <Link href={`/admin/users/${userInfo.uid}`} target="_blank" className="block w-full">
          <Button className="w-full bg-[#00D9C0] hover:bg-[#00C0AA] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all h-10 shadow-lg shadow-[#00D9C0]/20">
            Audit Full Transaction Record
          </Button>
        </Link>
      </div>
    </div>
  );
}
