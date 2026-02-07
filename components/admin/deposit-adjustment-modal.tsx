
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface DepositAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: {
    id: string;
    currency: string;
    cryptoAmount: string;
    usdtAmount: string;
    walletAddress: string;
    userDisplay?: string;
    depositAddress: string;
  };
  onSuccess: () => void;
}

export function DepositAdjustmentModal({
  isOpen,
  onClose,
  deposit,
  onSuccess,
}: DepositAdjustmentModalProps) {
  const [adjustedAmount, setAdjustedAmount] = useState(deposit.usdtAmount);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'adjust' | 'confirm'>('adjust');
  const [processingTime, setProcessingTime] = useState(0);

  const originalAmount = parseFloat(deposit.usdtAmount);
  const adjustedAmountNum = parseFloat(adjustedAmount) || 0;
  const difference = adjustedAmountNum - originalAmount;
  const differencePercent = originalAmount > 0 ? ((difference / originalAmount) * 100).toFixed(2) : '0';
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;
  const hasAdjustment = Math.abs(difference) > 0.01;

  const handleNext = () => {
    if (adjustedAmountNum <= 0) {
      toast.error('Adjusted amount must be greater than 0');
      return;
    }

    setStep('confirm');
  };

  const handleBack = () => {
    setStep('adjust');
  };

  const handleConfirm = async () => {
    console.log('🔵 [Deposit Adjustment] Starting approval process...');
    console.log('📦 Payload:', {
      depositId: deposit.id,
      originalAmount: originalAmount,
      adjustedAmount: adjustedAmountNum,
      adjustmentReason: adjustmentReason.trim() || 'No adjustment - approved as submitted',
      currency: deposit.currency,
    });

    setIsSubmitting(true);
    setProcessingTime(0);

    // Start processing timer
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setProcessingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Create an AbortController with 25-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('⏰ Request timed out after 25 seconds');
    }, 25000);

    try {
      // Token automatically sent via httpOnly cookie
      console.log('📡 Sending request to /api/admin/deposits/adjust-and-approve...');
      
      const response = await fetch('/api/admin/deposits/adjust-and-approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({
          depositId: deposit.id,
          originalAmount: originalAmount,
          adjustedAmount: adjustedAmountNum,
          adjustmentReason: adjustmentReason.trim() || 'No adjustment - approved as submitted',
          currency: deposit.currency,
        }),
        signal: controller.signal,
      });
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);

      console.log('📬 Response received:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success:', result);
        
        toast.success(
          hasAdjustment
            ? `Deposit adjusted and approved! ${isIncrease ? '📈' : '📉'} ${Math.abs(difference).toFixed(2)} USDT`
            : 'Deposit approved successfully!'
        );
        onSuccess();
        onClose();
        resetModal();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error response:', errorData);
        toast.error(errorData.error || 'Failed to process deposit');
      }
    } catch (error: any) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      console.error('💥 Exception caught:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(`Failed to process deposit: ${error.message || 'Unknown error'}`);
      }
    } finally {
      // Clear timers
      clearInterval(timerInterval);
      clearTimeout(timeoutId);
      
      console.log('🏁 Process completed, resetting submitting state');
      setIsSubmitting(false);
      setProcessingTime(0);
    }
  };

  const resetModal = () => {
    setAdjustedAmount(deposit.usdtAmount);
    setAdjustmentReason('');
    setStep('adjust');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetModal();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {step === 'adjust' ? 'Adjust & Approve Deposit' : 'Confirm Approval'}
          </DialogTitle>
          <DialogDescription>
            {step === 'adjust'
              ? 'Review and adjust the deposit amount before approval'
              : 'Review the changes before final approval'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium">User</p>
                <p className="font-semibold mt-1">
                  {deposit.userDisplay || `${deposit.walletAddress.slice(0, 8)}...${deposit.walletAddress.slice(-6)}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Currency</p>
                <p className="font-semibold mt-1">{deposit.currency}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs font-medium">Crypto Amount</p>
                <p className="font-mono text-sm mt-1">
                  {parseFloat(deposit.cryptoAmount).toFixed(8)} {deposit.currency}
                </p>
              </div>
            </div>
          </div>

          {step === 'adjust' ? (
            <>
              {/* Original Amount */}
              <div>
                <Label htmlFor="originalAmount" className="text-sm font-medium text-muted-foreground">
                  Original Amount (USDT)
                </Label>
                <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                  <p className="text-2xl font-bold text-foreground">
                    ${originalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Adjusted Amount Input */}
              <div>
                <Label htmlFor="adjustedAmount" className="text-sm font-medium">
                  Adjusted Amount (USDT) <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="adjustedAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    className="pl-10 text-lg font-semibold"
                    placeholder="Enter adjusted amount"
                  />
                </div>
                
                {/* Difference Indicator */}
                {hasAdjustment && (
                  <div className={`mt-2 p-2 rounded-md border ${
                    isIncrease 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {isIncrease ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={isIncrease ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                        {isIncrease ? '+' : ''}{difference.toFixed(2)} USDT ({differencePercent}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Adjustment Reason */}
              <div>
                <Label htmlFor="adjustmentReason" className="text-sm font-medium">
                  Reason for Adjustment <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="adjustmentReason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Add any notes or reason for this deposit approval..."
                  className="mt-2 min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {adjustmentReason.length}/500 characters
                </p>
              </div>

              {/* Warning for adjustments */}
              {hasAdjustment && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                        Adjustment will be logged
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                        All adjustments are recorded in the audit trail with timestamp and admin details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next: Review
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Step */}
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">Approval Summary</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-muted-foreground">Original Amount:</span>
                      <span className="font-semibold">${originalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-muted-foreground">Final Amount:</span>
                      <span className="font-bold text-lg text-primary">${adjustedAmountNum.toFixed(2)}</span>
                    </div>
                    
                    {hasAdjustment && (
                      <div className={`flex justify-between items-center p-2 rounded ${
                        isIncrease 
                          ? 'bg-green-100 dark:bg-green-950/30' 
                          : 'bg-red-100 dark:bg-red-950/30'
                      }`}>
                        <span className="text-sm font-medium">Adjustment:</span>
                        <span className={`font-bold ${
                          isIncrease 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {isIncrease ? '+' : ''}{difference.toFixed(2)} USDT ({differencePercent}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason Display */}
                {adjustmentReason && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {hasAdjustment ? 'Adjustment Reason:' : 'Admin Notes:'}
                    </Label>
                    <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">{adjustmentReason}</p>
                    </div>
                  </div>
                )}

                {/* Final Warning */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-800 dark:text-blue-300">
                        Confirm Approval
                      </p>
                      <p className="text-blue-700 dark:text-blue-400 mt-1">
                        The user's balance will be credited with <strong>${adjustedAmountNum.toFixed(2)} USDT</strong> immediately upon approval.
                        {hasAdjustment && ' This action is recorded in the audit trail.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing{processingTime > 0 ? ` (${processingTime}s)` : '...'}
                    </>
                  ) : (
                    'Confirm & Approve'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
