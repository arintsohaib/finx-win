
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Send, Loader2, User, CheckCheck, Check,
  Paperclip, X, FileText, Download,
  MessageCircle, Image as ImageIcon, ChevronUp, Bot, Camera
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import Image from 'next/image';

interface ChatMessage {
  id: string;
  sessionId?: string | null;
  walletAddress: string | null;
  adminId?: string | null;
  senderType: 'user' | 'admin';
  message: string;
  messageType?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isRead: boolean;
  delivered?: boolean;
  seen?: boolean;
  createdAt: string;
}

interface ChatSession {
  id: string;
  status: string;
  assignedAdminId?: string | null;
}

export function ChatPageEnhanced() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout>(undefined);
  const typingTimeout = useRef<NodeJS.Timeout>(undefined);
  const typingIndicatorTimeout = useRef<NodeJS.Timeout>(undefined);
  const lastScrollHeight = useRef<number>(0);
  const isAtBottom = useRef<boolean>(true);
  const lastMessageId = useRef<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    initChat();

    // Poll for new messages every 1.5 seconds
    pollingInterval.current = setInterval(() => {
      fetchMessages(true);
      checkAgentStatus();
      checkTypingStatus();
    }, 1500);

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (typingIndicatorTimeout.current) clearTimeout(typingIndicatorTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const newestMessage = messages[messages.length - 1];
      const isNewMessage = newestMessage.id !== lastMessageId.current;

      if (isNewMessage) {
        lastMessageId.current = newestMessage.id;
        if (isAtBottom.current || newestMessage.senderType === 'user') {
          scrollToBottom();
        }
      }
    }
  }, [messages]);

  // Mark messages as seen when page is active and has messages
  useEffect(() => {
    if (session?.id && messages.length > 0) {
      markMessagesAsSeen();
    }
  }, [session?.id, messages.length]);

  const initChat = async () => {
    await fetchOrCreateSession();
    await fetchMessages();
    checkAgentStatus();
  };

  const fetchOrCreateSession = async () => {
    try {
      const response = await fetch('/api/chat/session');
      const result = await response.json();
      if (result.success) {
        setSession(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch/create session:', error);
    }
  };

  const checkAgentStatus = async () => {
    try {
      const response = await fetch('/api/chat/agent-status');
      const result = await response.json();
      if (result.success) {
        setIsAgentOnline(result.data.online);
      }
    } catch (error) { }
  };

  const checkTypingStatus = async () => {
    if (!session?.id) return;
    try {
      const response = await fetch(`/api/chat/typing?sessionId=${session.id}`);
      if (response.ok) {
        const result = await response.json();
        const isTyping = result.data.isAdminTyping || false;
        setIsAgentTyping(isTyping);
        if (isTyping) {
          if (typingIndicatorTimeout.current) clearTimeout(typingIndicatorTimeout.current);
          typingIndicatorTimeout.current = setTimeout(() => setIsAgentTyping(false), 5000);
        }
      }
    } catch (error) { }
  };

  const markMessagesAsSeen = async () => {
    if (!session?.id) return;
    try {
      await fetch('/api/chat/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch (error) { }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTo({ top: container.scrollHeight, behavior });
      }
    }, 100);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottom.current = atBottom;
  };

  const fetchMessages = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await fetch('/api/chat/messages?limit=50');
      const result = await response.json();
      if (result.success) {
        const newMessages = result.data.messages || [];
        setHasMore(result.data.hasMore || false);
        setMessages(prev => {
          if (prev.length === 0) return newMessages;
          const existingIds = new Set(prev.map(m => m.id));
          const toAdd = newMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }
    } catch (error) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadPreviousMessages = async () => {
    if (!session?.id || !messages.length || isLoadingMore) return;
    setIsLoadingMore(true);
    const container = messagesContainerRef.current;
    if (container) lastScrollHeight.current = container.scrollHeight;
    try {
      const oldestMessage = messages[0];
      const response = await fetch(`/api/chat/messages?limit=20&before=${oldestMessage.id}`);
      if (response.ok) {
        const result = await response.json();
        const olderMessages = result.data.messages || [];
        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setHasMore(result.data.hasMore || false);
          setTimeout(() => {
            if (container) container.scrollTop = container.scrollHeight - lastScrollHeight.current;
          }, 0);
        }
      }
    } catch (error) { } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10MB'); return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) { toast.error('File type not supported'); return; }
    setSelectedFile(file);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const result = await response.json();
    if (!result.success) throw new Error('Upload failed');
    return result.data.url;
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!session?.id) return;
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, isTyping }),
      });
    } catch (error) { }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    updateTypingStatus(false);

    try {
      let fileUrl = null;
      let fileName = null;
      let messageType = 'text';

      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
        fileName = selectedFile.name;
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        setSelectedFile(null);
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText || `Sent a ${messageType}`, sessionId: session?.id, messageType, fileUrl, fileName }),
      });

      const result = await response.json();
      if (result.success) {
        setMessages(prev => [...prev, result.data]);
      } else {
        toast.error('Failed to send message');
        setNewMessage(messageText);
      }
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    updateTypingStatus(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => updateTypingStatus(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const getMessageStatus = (msg: ChatMessage) => {
    if (msg.senderType === 'admin') return null;
    if (msg.seen || msg.isRead) return <CheckCheck className="w-3 h-3 text-[#00D9C0]" />;
    if (msg.delivered) return <CheckCheck className="w-3 h-3 text-muted-foreground/40" />;
    return <Check className="w-3 h-3 text-muted-foreground/40" />;
  };

  // Group messages
  const groupMessages = (messages: ChatMessage[]) => {
    if (messages.length === 0) return [];
    const groups: any[] = [];
    let currentGroup: any = null;

    messages.forEach((msg, index) => {
      const msgDate = format(new Date(msg.createdAt), 'MMMM dd, yyyy');
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const timeDiff = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : 0;

      if (!currentGroup || msg.senderType !== currentGroup.senderType || msgDate !== currentGroup.date || timeDiff > 2 * 60 * 1000) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { senderType: msg.senderType, messages: [msg], date: msgDate };
      } else {
        currentGroup.messages.push(msg);
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  };

  const messageGroups = groupMessages(messages);

  return (
    <div className="min-h-screen gradient-subtle">
      <div className={cn("mx-auto px-2 sm:px-4 py-4 sm:py-8 pb-32", isMobile ? "max-w-full" : "max-w-3xl")}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="gradientGhost"
            size="icon"
            onClick={() => router.back()}
            className="h-12 w-12 rounded-2xl glass-card border-white/5 active:scale-90 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">Global Support</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1 flex items-center gap-2">
              <span className={cn("inline-block w-2 h-2 rounded-full", isAgentOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-500")}></span>
              {isAgentOnline ? 'Support Online' : 'Support Offline'} • Reply time ~5m
            </p>
          </div>
          {isAgentTyping && (
            <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-[10px] font-black uppercase text-primary">Typing</span>
            </div>
          )}
        </div>

        {/* Chat Main Container */}
        <Card className="glass-card shadow-2xl border-white/5 overflow-hidden flex flex-col h-[70vh]">
          {/* Scrollable Message Area */}
          <div
            className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {hasMore && (
              <div className="flex justify-center mb-6">
                <Button variant="ghost" size="sm" onClick={loadPreviousMessages} disabled={isLoadingMore} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {isLoadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Load previous messages'}
                </Button>
              </div>
            )}

            {isLoading && messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Encrypting Session...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-xs mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black tracking-tight">Need Assistance?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Our support network is active. Send a message to start a secure session with a verified agent.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messageGroups.map((group, groupIndex) => {
                  const isUser = group.senderType === 'user';
                  return (
                    <div key={groupIndex} className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-auto shadow-sm", isUser ? "bg-primary text-white" : "bg-neutral-800 text-[#00D9C0]")}>
                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isUser ? "items-end" : "items-start")}>
                        {group.messages.map((msg: any, msgIndex: any) => (
                          <div key={msg.id} className={cn(
                            "px-4 py-3 text-sm font-medium shadow-sm relative group/msg",
                            isUser
                              ? "bg-primary text-white rounded-2xl rounded-tr-none"
                              : "bg-background border border-white/5 rounded-2xl rounded-tl-none"
                          )}>
                            {msg.messageType === 'image' && msg.fileUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                <ImageLightbox src={msg.fileUrl} alt="Preview" trigger={
                                  <img src={msg.fileUrl} className="max-w-full h-auto cursor-zoom-in" />
                                } />
                              </div>
                            )}
                            {msg.messageType === 'file' && msg.fileUrl && (
                              <a href={msg.fileUrl} target="_blank" className="flex items-center gap-2 bg-black/20 p-2 rounded-lg mb-2 hover:bg-black/30 transition-colors">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs truncate max-w-[150px]">{msg.fileName}</span>
                              </a>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                            {/* Timestamp + Status */}
                            <div className={cn("text-[9px] font-black uppercase tracking-widest mt-1 opacity-40 flex items-center gap-1", isUser ? "justify-end" : "justify-start")}>
                              {format(new Date(msg.createdAt), 'HH:mm')}
                              {isUser && getMessageStatus(msg)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-secondary/20 border-t border-white/5">
            {selectedFile && (
              <div className="mb-4 p-2 rounded-xl bg-background border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{selectedFile.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="h-6 w-6">
                  <X className="h-3 w-3 text-rose-500" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              <Button
                variant="gradientGhost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-12 w-12 rounded-2xl glass-card flex-shrink-0"
              >
                <Camera className="h-5 w-5 opacity-60" />
              </Button>

              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="h-12 bg-background/50 border-white/5 rounded-2xl px-5 text-sm font-medium focus-visible:ring-primary/30"
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedFile)}
                className="h-12 w-12 rounded-2xl bg-primary text-white shadow-lg active:scale-95 transition-all flex-shrink-0"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Banner */}
        <div className="mt-8 p-6 rounded-3xl bg-[#00D9C0]/5 border border-[#00D9C0]/10 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00D9C0]/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-[#00D9C0]" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#00D9C0] mb-1">Encrypted Support</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All communications are end-to-end encrypted. Support agents will never ask for your private keys or seed phrases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
