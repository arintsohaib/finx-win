"use client";

import { useState, useEffect } from 'react';
import { Mail, Search, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface User {
  uid: string;
  email: string;
  walletAddress: string;
  fullName: string | null;
  kycVerified: boolean;
}

type SearchType = 'email' | 'uid' | 'wallet' | 'name';
type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export function MailServerTab() {
  // Search state
  const [searchType, setSearchType] = useState<SearchType>('email');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Selected user and email composition state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchType]);

  // Perform user search
  const performSearch = async () => {
    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}&type=${searchType}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.users || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowResults(false);
    setSearchTerm('');
    setSearchResults([]);
    // Reset email fields
    setSubject('');
    setBody('');
    setSendStatus('idle');
    setErrorMessage('');
  };

  // Handle send email
  const handleSendEmail = async () => {
    if (!selectedUser || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSendStatus('sending');
      setErrorMessage('');

      const response = await fetch('/api/admin/mail-server/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipientUid: selectedUser.uid,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSendStatus('success');
      toast.success(`Email sent successfully to ${selectedUser.email}`);

      // Reset form after 2 seconds
      setTimeout(() => {
        setSelectedUser(null);
        setSubject('');
        setBody('');
        setSendStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Send email error:', error);
      setSendStatus('error');
      setErrorMessage(error.message || 'Failed to send email');
      toast.error(error.message || 'Failed to send email');

      // Reset error status after 3 seconds
      setTimeout(() => {
        setSendStatus('idle');
        setErrorMessage('');
      }, 3000);
    }
  };

  // Get search placeholder text
  const getPlaceholder = () => {
    switch (searchType) {
      case 'email':
        return 'Search by email...';
      case 'uid':
        return 'Search by UID...';
      case 'wallet':
        return 'Search by wallet address...';
      case 'name':
        return 'Search by full name...';
      default:
        return 'Search...';
    }
  };

  // Check if send button should be disabled
  const isSendDisabled =
    !selectedUser ||
    !subject.trim() ||
    !body.trim() ||
    sendStatus === 'sending' ||
    sendStatus === 'success';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mail Server</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Send emails to KYC-verified users</p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Users
          </CardTitle>
          <CardDescription>
            Find KYC-verified users to send emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {/* Search Type Dropdown */}
            <Select value={searchType} onValueChange={(value: SearchType) => setSearchType(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="uid">UID</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={getPlaceholder()}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="border rounded-lg bg-card max-h-60 overflow-y-auto shadow-sm">
              {searchResults.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => handleUserSelect(user)}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        UID: {user.uid} • {user.fullName || 'No name'}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-500 font-medium">✓ KYC Verified</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users found matching &quot;{searchTerm}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Composer Section (only show when user is selected) */}
      {selectedUser && (
        <Card className="animate-in slide-in-from-bottom duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compose Email
            </CardTitle>
            <CardDescription>
              Send email to selected user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Info (Read-only) */}
            <div>
              <Label>To</Label>
              <div className="mt-1 p-3 bg-muted border rounded-lg">
                <p className="text-sm font-medium">{selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  UID: {selectedUser.uid} • {selectedUser.fullName || 'No name'}
                </p>
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <Label htmlFor="subject">
                Subject
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{subject.length}/200 characters</p>
            </div>

            {/* Message Body Field */}
            <div>
              <Label htmlFor="body">
                Message
              </Label>
              <Textarea
                id="body"
                placeholder="Enter your message here...&#10;&#10;You can use multiple lines."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={10}
                className="mt-1 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{body.length}/5000 characters</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendEmail}
              disabled={isSendDisabled}
              className={cn(
                'w-full font-semibold transition-all',
                sendStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                  : sendStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              )}
            >
              {sendStatus === 'sending' && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              )}
              {sendStatus === 'success' && (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sent!
                </>
              )}
              {sendStatus === 'error' && (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Failed
                </>
              )}
              {sendStatus === 'idle' && (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Mail
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
