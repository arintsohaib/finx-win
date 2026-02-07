
'use client';

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Shield, Lock, ZoomIn, Upload, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';
import Image from 'next/image';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { buildImageUrlClient } from '@/lib/url-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries, Country } from '@/lib/data/countries';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);
  const [kycData, setKycData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // KYC Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'US') || countries[0]);
  const [documentUrl, setDocumentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch KYC status on mount
  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!user?.walletAddress) return;

      try {
        const response = await fetch(`/api/kyc/status`);
        if (response.ok) {
          const data = await response.json();
          setKycData(data);

          // Pre-fill form if KYC data exists
          if (data.fullName) setFullName(data.fullName);
          if (data.email) setEmail(data.email);
          if (data.phone) {
            // Try to separate country dial code from phone number
            const matchedCountry = countries
              .sort((a, b) => b.dial_code.length - a.dial_code.length) // Longest match first
              .find(c => data.phone.startsWith(c.dial_code));

            if (matchedCountry) {
              setSelectedCountry(matchedCountry);
              setPhone(data.phone.slice(matchedCountry.dial_code.length).trim());
            } else {
              setPhone(data.phone);
            }
          }
          if (data.documentUrl) setDocumentUrl(data.documentUrl);
        }
      } catch (error) {
        console.error('Failed to fetch KYC status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKYCStatus();
  }, [user?.walletAddress]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentUrl(data.fileUrl);
        toast.success('Document uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName || !email || !phone) {
      toast.error('Please fill in all required fields (Name, Email, Phone)');
      return;
    }

    setIsSubmittingKYC(true);

    try {
      // Combine dial code and phone number
      const fullPhone = `${selectedCountry.dial_code} ${phone.trim()}`;

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          phone: fullPhone,
          documentUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'KYC information submitted successfully!');
        setKycData(result.submission);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit KYC information');
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      toast.error('Failed to submit KYC information');
    } finally {
      setIsSubmittingKYC(false);
    }
  };

  const kycStatus = kycData?.kycStatus || 'not_submitted';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="gradientGhost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Profile & KYC</h1>
          </div>
        </div>

        <Tabs defaultValue="kyc" className="w-full">
          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Identity Verification
                </CardTitle>
                <CardDescription>
                  Complete your profile to unlock all features
                </CardDescription>

                {/* KYC Status Badge */}
                {isLoading ? (
                  <div className="mt-4 flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading KYC status...</span>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {kycStatus === 'not_submitted' && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span>KYC not submitted - Please complete the form below</span>
                      </div>
                    )}
                    {kycStatus === 'pending' && (
                      <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span>KYC pending admin approval - We'll review your submission shortly</span>
                      </div>
                    )}
                    {kycStatus === 'approved' && (
                      <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>✓ KYC Verified - Your account is fully verified and active</span>
                      </div>
                    )}
                    {kycStatus === 'rejected' && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                          <XCircle className="h-4 w-4" />
                          <span>KYC Rejected</span>
                        </div>
                        {kycData?.kycRejectionReason && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                            <p className="font-medium">Rejection Reason:</p>
                            <p className="mt-1">{kycData.kycRejectionReason}</p>
                            <p className="mt-2 text-xs">You can resubmit your KYC information below.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleKYCSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold">Personal Information</h3>
                      {(kycStatus === 'approved' || kycStatus === 'pending') && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          placeholder="John Doe"
                          disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                          className={(kycStatus === 'approved' || kycStatus === 'pending') ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="john@example.com"
                          disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                          className={(kycStatus === 'approved' || kycStatus === 'pending') ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="flex gap-2">
                          <div className="w-[110px]">
                            <Select
                              value={selectedCountry.code}
                              onValueChange={(value) => {
                                const country = countries.find(c => c.code === value);
                                if (country) setSelectedCountry(country);
                              }}
                              disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                            >
                              <SelectTrigger className={(kycStatus === 'approved' || kycStatus === 'pending') ? 'bg-muted cursor-not-allowed' : ''}>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((c) => (
                                  <SelectItem key={c.code} value={c.code}>
                                    <span className="flex items-center gap-2">
                                      <span>{c.emoji}</span>
                                      <span>{c.dial_code}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="555 000-0000"
                            disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                            className={cn("flex-1", (kycStatus === 'approved' || kycStatus === 'pending') ? 'bg-muted cursor-not-allowed' : '')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div className="pt-4 border-t">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="document" className="flex items-center gap-2">
                            Identity Document
                            {documentUrl && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </Label>
                        </div>

                        {/* Preview Section */}
                        {documentUrl && (
                          <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/30">
                            <ImageLightbox
                              src={buildImageUrlClient(documentUrl)}
                              alt="Identity Document"
                              trigger={
                                <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg border border-primary/20 bg-background hover:border-primary/40 transition-all cursor-pointer overflow-hidden group">
                                  <Image
                                    src={buildImageUrlClient(documentUrl)}
                                    alt="Identity Document Preview"
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
                            <p className="mt-2 text-xs text-muted-foreground">Click to enlarge</p>
                          </div>
                        )}

                        {(kycStatus !== 'approved' && kycStatus !== 'pending') && (
                          <div className="space-y-2">
                            <div
                              onClick={() => document.getElementById('document')?.click()}
                              className={`
                                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                  ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5'}
                                  ${documentUrl ? 'border-green-200 bg-green-50/10' : 'border-muted'}
                                `}
                            >
                              <input
                                id="document"
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="hidden"
                              />
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {isUploading ? 'Uploading...' : documentUrl ? 'Change Document' : 'Click to upload Identity Document'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG or PDF up to 5MB
                              </p>
                            </div>
                          </div>
                        )}

                        {kycStatus === 'pending' && !documentUrl && (
                          <div className="space-y-4">
                            <div
                              onClick={() => document.getElementById('document-pending')?.click()}
                              className="border-2 border-dashed border-yellow-200 bg-yellow-50/5 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/10 transition-colors"
                            >
                              <input
                                id="document-pending"
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="hidden"
                              />
                              <Upload className="h-8 w-8 mx-auto mb-2 text-yellow-600/50" />
                              <p className="text-sm font-medium text-yellow-700">
                                {isUploading ? 'Uploading...' : 'Upload missing document'}
                              </p>
                            </div>
                            <p className="text-xs text-yellow-600 text-center">
                              Your application is pending. You can still upload your identity document to speed up approval.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button Logic */}
                  {(kycStatus === 'not_submitted' || kycStatus === 'rejected') ? (
                    <Button
                      type="submit"
                      disabled={isSubmittingKYC || isUploading}
                      className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                    >
                      {isSubmittingKYC ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {kycStatus === 'rejected' ? 'Resubmitting...' : 'Submitting...'}
                        </div>
                      ) : kycStatus === 'rejected' ? (
                        <>
                          <ShieldCheck className="mr-2 h-5 w-5" />
                          Resubmit KYC Application
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-5 w-5" />
                          Submit KYC Application
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        type="button"
                        disabled
                        className="w-full h-12 text-base font-semibold opacity-50 cursor-not-allowed"
                      >
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        {kycStatus === 'approved' ? 'Identity Verified' : 'Application Under Review'}
                      </Button>

                      {kycStatus === 'pending' && (
                        <p className="text-xs text-center text-muted-foreground animate-pulse">
                          Submit button disabled until admin review is complete.
                        </p>
                      )}
                    </div>
                  )}

                  {kycStatus === 'pending' && !documentUrl && (
                    <div className="mt-4 p-4 bg-muted/20 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        If you just uploaded a document, it will be automatically included in your review.
                      </p>
                    </div>
                  )}

                  {kycStatus === 'approved' && (
                    <div className="w-full p-4 bg-green-50/50 border border-green-200 rounded-lg flex items-center justify-center gap-3 text-green-800">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-semibold">Your account is fully verified. No further action is required.</span>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
