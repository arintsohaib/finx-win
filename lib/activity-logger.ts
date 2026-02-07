
// Centralized activity logging system for Live Overview

import { prisma } from '@/lib/db';
import { realtimeEvents } from '@/lib/realtime-events';

export type ActivityType =
  | 'TRADE_CREATED'
  | 'TRADE_COMPLETED'
  | 'DEPOSIT_REQUEST'
  | 'DEPOSIT_APPROVED'
  | 'DEPOSIT_REJECTED'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'CONVERSION'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'DEPOSIT_ADJUSTED'
  | 'USER_ASSIGNED_TO_EMPLOYEE'
  | 'USER_UNASSIGNED_FROM_EMPLOYEE';

export type ActivityCategory =
  | 'TRADE'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CONVERSION'
  | 'KYC'
  | 'ADMIN';

export type ActivityStatus = 'pending' | 'success' | 'failed' | 'rejected';

export interface LogActivityParams {
  walletAddress: string;
  uid: string;
  userName?: string;
  userEmail?: string;
  activityType: ActivityType;
  activityCategory: ActivityCategory;
  cryptoType?: string;
  amount?: number | string;
  amountUsd?: number | string;
  status?: ActivityStatus;
  referenceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  adminId?: string;
}

/**
 * Centralized activity logger for Live Overview
 * Logs all user activities and emits real-time events
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const {
      walletAddress,
      uid,
      userName,
      userEmail,
      activityType,
      activityCategory,
      cryptoType,
      amount,
      amountUsd,
      status = 'pending',
      referenceId,
      metadata,
      ipAddress,
      userAgent,
      adminId,
    } = params;

    // Create activity log entry
    const activity = await prisma.activityLog.create({
      data: {
        walletAddress,
        uid,
        userName,
        userEmail,
        activityType,
        activityCategory,
        cryptoType,
        amount: amount ? parseFloat(amount.toString()) : null,
        amountUsd: amountUsd ? parseFloat(amountUsd.toString()) : null,
        status,
        referenceId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
        adminId,
      },
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            kycStatus: true,
          },
        },
      },
    });

    // Emit real-time event for instant admin updates
    realtimeEvents.emit('activity:created', {
      ...activity,
      metadata: metadata || null, // Send parsed metadata
    });

    return activity;
  } catch (error) {
    console.error('[Activity Logger] Error logging activity:', error);
    // Don't throw - activity logging should never break main functionality
    return null;
  }
}

/**
 * Update activity status by reference ID
 * Used when a pending activity is approved/rejected
 */
export async function updateActivityStatus(
  referenceId: string,
  newStatus: ActivityStatus,
  newActivityType?: ActivityType,
  additionalMetadata?: Record<string, any>
) {
  try {
    // Find the activity log by reference ID
    const existingActivity = await prisma.activityLog.findFirst({
      where: { referenceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingActivity) {
      console.warn(`[Activity Logger] No activity found with referenceId: ${referenceId}`);
      return null;
    }

    // Parse existing metadata
    let mergedMetadata = existingActivity.metadata
      ? JSON.parse(existingActivity.metadata as string)
      : {};

    // Merge with additional metadata if provided
    if (additionalMetadata) {
      mergedMetadata = { ...mergedMetadata, ...additionalMetadata };
    }

    // Update the activity
    const updatedActivity = await prisma.activityLog.update({
      where: { id: existingActivity.id },
      data: {
        status: newStatus,
        activityType: newActivityType || existingActivity.activityType,
        metadata: JSON.stringify(mergedMetadata),
      },
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            kycStatus: true,
          },
        },
      },
    });

    // Emit real-time event for the update
    realtimeEvents.emit('activity:updated', {
      ...updatedActivity,
      metadata: mergedMetadata,
    });

    return updatedActivity;
  } catch (error) {
    console.error('[Activity Logger] Error updating activity status:', error);
    return null;
  }
}

/**
 * Get activity display text with asset context
 */
export function getActivityDisplayText(
  activityType: ActivityType,
  metadata?: any
): string {
  // For trade activities, include the asset in the description
  if (activityType === 'TRADE_CREATED' && metadata?.asset) {
    return `Opened ${metadata.asset} Trade`;
  }
  if (activityType === 'TRADE_COMPLETED' && metadata?.asset) {
    return `${metadata.asset} Trade Completed`;
  }

  // For conversion, show the conversion pair
  if (activityType === 'CONVERSION' && metadata?.fromCurrency && metadata?.toCurrency) {
    return `${metadata.fromCurrency} → ${metadata.toCurrency} Conversion`;
  }

  const textMap: Record<ActivityType, string> = {
    TRADE_CREATED: 'Opened Trade',
    TRADE_COMPLETED: 'Trade Completed',
    DEPOSIT_REQUEST: 'Deposit Request',
    DEPOSIT_APPROVED: 'Deposit Approved',
    DEPOSIT_REJECTED: 'Deposit Rejected',
    WITHDRAWAL_REQUEST: 'Withdrawal Request',
    WITHDRAWAL_APPROVED: 'Withdrawal Approved',
    WITHDRAWAL_REJECTED: 'Withdrawal Rejected',
    CONVERSION: 'Crypto Conversion',
    KYC_SUBMITTED: 'KYC Submitted',
    KYC_APPROVED: 'KYC Approved',
    KYC_REJECTED: 'KYC Rejected',
    DEPOSIT_ADJUSTED: 'Deposit Adjusted & Approved',
    USER_ASSIGNED_TO_EMPLOYEE: 'User Assigned to Employee',
    USER_UNASSIGNED_FROM_EMPLOYEE: 'User Unassigned from Employee',
  };

  return textMap[activityType] || activityType;
}

/**
 * Get activity status badge color
 */
export function getActivityStatusColor(status: ActivityStatus): string {
  const colorMap: Record<ActivityStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get activity status display text
 * Maps 'success' → 'Win' and 'failed' → 'Loss' for trade activities
 */
export function getActivityStatusDisplayText(
  status: ActivityStatus,
  activityCategory: ActivityCategory
): string {
  // For trade activities, use Win/Loss instead of Success/Failed
  if (activityCategory === 'TRADE') {
    if (status === 'success') return 'Win';
    if (status === 'failed') return 'Loss';
  }

  // For other activities, capitalize the status
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Get activity category icon
 */
export function getActivityCategoryIcon(category: ActivityCategory): string {
  const iconMap: Record<ActivityCategory, string> = {
    TRADE: '📈',
    DEPOSIT: '💰',
    WITHDRAWAL: '🏦',
    CONVERSION: '🔄',
    KYC: '🔐',
    ADMIN: '👥',
  };

  return iconMap[category] || '📋';
}
