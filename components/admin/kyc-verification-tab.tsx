
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, XCircle, Eye, Clock, Filter, Shield, AlertTriangle, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface KYCSubmission {
  id: string;
  walletAddress: string;
  fullName: string;
  email: string;
  phone: string | null;
  documentUrl: string | null;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  user: {
    uid: string;
    walletAddress: string;
  };
}

export function KYCVerificationTab() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [isLoadingKycSetting, setIsLoadingKycSetting] = useState(true);

  useEffect(() => {
    fetchSubmissions();
    fetchKycSetting();
  }, [statusFilter]);

  const fetchKycSetting = async () => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/kyc/settings', {
        credentials: 'include',
        headers: {
        },
      });
      if (response.ok) {
        const result = await response.json();
        setKycRequired(result.kycRequired);
      } else {
        console.error('Failed to fetch KYC setting');
      }
    } catch (error) {
      console.error('Failed to fetch KYC setting:', error);
    } finally {
      setIsLoadingKycSetting(false);
    }
  };

  const handleToggleKycRequirement = async (checked: boolean) => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/kyc/settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'admin-token': document.cookie.split('admin_token=')[1]?.split(';')[0] || '' // Fallback if credentials include fails
        },
        body: JSON.stringify({ kycRequired: checked }),
      });

      if (response.ok) {
        setKycRequired(checked);
        toast.success(checked ? 'KYC verification enabled for withdrawals' : 'KYC verification disabled for withdrawals');
      } else {
        toast.error('Failed to update KYC setting');
      }
    } catch (error) {
      console.error('Toggle KYC requirement error:', error);
      toast.error('Failed to update KYC setting');
    }
  };

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/kyc?status=${statusFilter}`, {
        credentials: 'include',
        headers: {
        },
      });
      if (response.ok) {
        const result = await response.json();
        setSubmissions(result.data);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to fetch KYC submissions');
        console.error('API error:', errorData);
      }
    } catch (error) {
      console.error('Fetch KYC submissions error:', error);
      toast.error('Failed to fetch KYC submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSubmission = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setIsViewDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/kyc/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
        },
      });

      if (response.ok) {
        toast.success('KYC approved successfully');
        fetchSubmissions();
        setIsViewDialogOpen(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to approve KYC');
      }
    } catch (error) {
      console.error('Approve KYC error:', error);
      toast.error('Failed to approve KYC');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/kyc/${selectedSubmission.id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        toast.success('KYC rejected successfully');
        fetchSubmissions();
        setIsViewDialogOpen(false);
        setIsRejectDialogOpen(false);
        setRejectionReason('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to reject KYC');
      }
    } catch (error) {
      console.error('Reject KYC error:', error);
      toast.error('Failed to reject KYC');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KYC Requirement Toggle */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">KYC Requirement for Withdrawals</h3>
                <p className="text-sm text-muted-foreground">
                  {kycRequired
                    ? 'KYC verification is currently required for all withdrawals'
                    : 'Users can withdraw without KYC verification'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isLoadingKycSetting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <Label htmlFor="kyc-toggle" className="text-sm font-medium cursor-pointer">
                    {kycRequired ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id="kyc-toggle"
                    checked={kycRequired}
                    onCheckedChange={handleToggleKycRequirement}
                  />
                </>
              )}
            </div>
          </div>
          {kycRequired && (
            <div className="mt-4 flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> Users without approved KYC will be unable to withdraw funds. They will be prompted to complete KYC verification in their Profile page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification Management</CardTitle>
          <CardDescription>
            Review and approve/reject user KYC submissions (Full Name + Email)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex items-center space-x-2 mb-6">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label>Filter by Status:</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button onClick={fetchSubmissions} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No KYC submissions found
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-mono">{submission.user.uid}</TableCell>
                      <TableCell>{submission.fullName}</TableCell>
                      <TableCell>{submission.email}</TableCell>
                      <TableCell>{submission.phone || '-'}</TableCell>
                      <TableCell>{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleViewSubmission(submission)}
                          variant="gradientGhost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Submission Details</DialogTitle>
            <DialogDescription>
              Review the user's KYC information
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Status */}
              <div>
                <Label>Current Status</Label>
                <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User UID</Label>
                  <div className="mt-1 text-sm font-mono">{selectedSubmission.user.uid}</div>
                </div>
                <div>
                  <Label>Wallet Address</Label>
                  <div className="mt-1 text-sm font-mono text-xs break-all">{selectedSubmission.walletAddress}</div>
                </div>
                <div>
                  <Label>Full Name</Label>
                  <div className="mt-1 text-sm font-semibold">{selectedSubmission.fullName}</div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="mt-1 text-sm">{selectedSubmission.email}</div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <div className="mt-1 text-sm">{selectedSubmission.phone || '-'}</div>
                </div>
              </div>

              {/* Document Image */}
              {selectedSubmission.documentUrl ? (
                <div>
                  <Label>Identity Document</Label>
                  <div className="mt-2">
                    {(selectedSubmission.documentUrl.toLowerCase().endsWith('.pdf') ||
                      selectedSubmission.documentUrl.includes('application/pdf')) ? (
                      <div className="border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 p-8 text-center">
                        <p className="mb-4">PDF Document</p>
                        <a
                          href={selectedSubmission.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Open Document
                        </a>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <ImageLightbox
                          src={selectedSubmission.documentUrl}
                          alt="Identity Document"
                          trigger={
                            <div className="relative w-full max-w-sm aspect-[4/3] rounded-lg border border-primary/20 bg-muted/50 hover:border-primary/40 transition-all cursor-pointer overflow-hidden group mx-auto">
                              <Image
                                src={selectedSubmission.documentUrl}
                                alt="Identity Document"
                                fill
                                className="object-contain group-hover:scale-105 transition-transform p-2"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                              </div>
                            </div>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-dashed text-center text-muted-foreground text-sm">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No document uploaded
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted At</Label>
                  <div className="mt-1">{new Date(selectedSubmission.submittedAt).toLocaleString()}</div>
                </div>
                {selectedSubmission.reviewedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reviewed At</Label>
                    <div className="mt-1">{new Date(selectedSubmission.reviewedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Rejection Reason (if rejected) */}
              {selectedSubmission.status === 'rejected' && selectedSubmission.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <Label className="text-red-800">Rejection Reason</Label>
                  <p className="mt-1 text-sm text-red-700">{selectedSubmission.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedSubmission?.status === 'pending' && (
              <>
                <Button
                  onClick={() => setIsRejectDialogOpen(true)}
                  variant="destructive"
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            <Button onClick={() => setIsViewDialogOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this KYC submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Invalid email format, suspicious activity, etc."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsRejectDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleReject} variant="destructive" disabled={isProcessing || !rejectionReason.trim()}>
              {isProcessing ? 'Rejecting...' : 'Reject KYC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
