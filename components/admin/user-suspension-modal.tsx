
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserSuspensionModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
    uid: string;
    currentStatus: boolean; // true = suspended
    currentReason: string | null;
    onSuccess: () => void;
}

const PRESET_REASONS = [
    "Violation of Terms of Service",
    "Suspicious trading activity detected",
    "Multiple fake deposits attempts",
    "Multiple failed verification attempts",
    "Account security compromise suspected",
    "Regulatory compliance issue",
    "Other"
];

export function UserSuspensionModal({
    isOpen,
    onClose,
    walletAddress,
    uid,
    currentStatus,
    currentReason,
    onSuccess
}: UserSuspensionModalProps) {
    const [loading, setLoading] = useState(false);
    const [reasonType, setReasonType] = useState<string>("");
    const [customReason, setCustomReason] = useState("");

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (currentStatus && currentReason) {
                // Try to match existing reason to preset
                if (PRESET_REASONS.includes(currentReason)) {
                    setReasonType(currentReason);
                    setCustomReason("");
                } else {
                    setReasonType("Other");
                    setCustomReason(currentReason);
                }
            } else {
                setReasonType("");
                setCustomReason("");
            }
        }
    }, [isOpen, currentStatus, currentReason]);

    const handleReasonTypeChange = (value: string) => {
        setReasonType(value);
        // Clear custom reason if switching away from Other
        if (value !== "Other") {
            setCustomReason("");
        }
    };

    const handleSubmit = async () => {
        // If suspending, reason is required
        const isSuspending = !currentStatus;

        let finalReason = null;
        if (isSuspending) {
            if (!reasonType) {
                toast.error("Please select a reason for suspension");
                return;
            }
            if (reasonType === "Other" && !customReason.trim()) {
                toast.error("Please enter specific details for 'Other' reason");
                return;
            }
            finalReason = reasonType === "Other" ? customReason : reasonType;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/admin/users/suspend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid,
                    isSuspended: isSuspending,
                    suspensionReason: finalReason
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to update suspension status');
            }
        } catch (error) {
            console.error('Error updating suspension:', error);
            toast.error('Failed to update suspension status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {currentStatus ? (
                            <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Unsuspend User
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="h-5 w-5 text-red-600" />
                                Suspend User
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {currentStatus
                            ? "Are you sure you want to reactivate this user's access? They will be able to trade and withdraw funds immediately."
                            : "This will immediately block the user from accessing the dashboard. All trading and withdrawals will be halted."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md bg-muted p-3 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-medium text-muted-foreground">User UID:</span>
                            <span className="col-span-2 font-mono">{uid}</span>

                            <span className="font-medium text-muted-foreground">Wallet:</span>
                            <span className="col-span-2 font-mono break-all text-xs">{walletAddress}</span>
                        </div>
                    </div>

                    {!currentStatus && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Suspension Reason</Label>
                                <Select value={reasonType} onValueChange={handleReasonTypeChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a reason..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRESET_REASONS.map((reason) => (
                                            <SelectItem key={reason} value={reason}>
                                                {reason}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {reasonType === "Other" && (
                                <div className="space-y-2">
                                    <Label>Specific Details</Label>
                                    <Textarea
                                        placeholder="Enter specific reason for suspension..."
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        className="h-24"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-md border border-red-100 dark:border-red-900/30">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <p>User will see an "Account Suspended" overlay with the reason above.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
                        Cancel
                    </Button>
                    <Button
                        variant={currentStatus ? "default" : "destructive"}
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 sm:flex-none"
                    >
                        {loading ? "Updating..." : (currentStatus ? "Unsuspend User" : "Suspend User")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
