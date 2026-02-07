export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
declare const process: any;
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { requireAdmin } from '@/lib/admin-middleware';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
// Set max duration for serverless function (in seconds)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  console.log('🟢 [API] Adjust-and-approve endpoint called at', new Date().toISOString());

  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { admin } = authResult;

    const body = await request.json();
    console.log('📥 [API] Request body:', JSON.stringify(body, null, 2));

    const {
      depositId,
      originalAmount,
      adjustedAmount,
      adjustmentReason,
      currency,
    } = body;

    // Validation
    console.log('🔍 [API] Validating fields...');

    if (!depositId || originalAmount === undefined || adjustedAmount === undefined || !adjustmentReason) {
      console.error('❌ [API] Validation failed: Missing required fields', {
        depositId: !!depositId,
        originalAmount: originalAmount !== undefined,
        adjustedAmount: adjustedAmount !== undefined,
        adjustmentReason: !!adjustmentReason
      });

      return NextResponse.json(
        {
          error: 'Missing required fields', details: {
            depositId: !!depositId,
            originalAmount: originalAmount !== undefined,
            adjustedAmount: adjustedAmount !== undefined,
            adjustmentReason: !!adjustmentReason
          }
        },
        { status: 400 }
      );
    }

    if (adjustedAmount <= 0) {
      console.error('❌ [API] Validation failed: Invalid adjusted amount', adjustedAmount);
      return NextResponse.json(
        { error: 'Adjusted amount must be greater than 0' },
        { status: 400 }
      );
    }

    console.log('✅ [API] Validation passed');

    // Fetch the deposit
    console.log('🔍 [API] Fetching deposit:', depositId);
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      console.error('❌ [API] Deposit not found:', depositId);
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    console.log('✅ [API] Deposit found:', {
      id: deposit.id,
      status: deposit.status,
      currency: deposit.currency,
      walletAddress: deposit.walletAddress
    });

    if (deposit.status !== 'pending') {
      console.error('❌ [API] Deposit already processed. Current status:', deposit.status);
      return NextResponse.json(
        { error: 'Deposit has already been processed' },
        { status: 400 }
      );
    }

    const adjustmentAmount = adjustedAmount - originalAmount;
    const hasAdjustment = Math.abs(adjustmentAmount) > 0.01;

    console.log('💰 [API] Processing amounts:', {
      original: originalAmount,
      adjusted: adjustedAmount,
      adjustment: adjustmentAmount,
      hasAdjustment
    });

    // Start transaction with timeout protection
    console.log('🔄 [API] Starting database transaction...');
    const result = await prisma.$transaction(async (tx: any) => {
      console.log('🔹 [TX] Transaction started');
      const startTime = Date.now();
      // Update deposit status and adjustment info
      console.log('🔹 [TX] Updating deposit record...');
      const updatedDeposit = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'adjusted',
          originalAmount: originalAmount.toString(),
          adjustedAmount: adjustedAmount.toString(),
          adjustmentReason: adjustmentReason,
          adjustedBy: admin.username,
          adjustedAt: new Date(),
          processedBy: admin.username,
          processedAt: new Date(),
          approvedAt: new Date(),
        },
      });
      console.log('✅ [TX] Deposit record updated');

      // Credit user balance with the ACTUAL CRYPTO CURRENCY (not USDT!)
      // This must match the deposit currency (BTC, ETH, etc.)
      console.log('🔹 [TX] Upserting balance for currency:', deposit.currency);

      // Calculate crypto amount based on adjustment
      const originalCryptoAmount = parseFloat(deposit.cryptoAmount.toString());
      const adjustmentRatio = adjustedAmount / originalAmount;
      const adjustedCryptoAmount = originalCryptoAmount * adjustmentRatio;

      console.log('💰 [TX] Crypto calculation:', {
        originalCrypto: originalCryptoAmount,
        adjustmentRatio: adjustmentRatio,
        adjustedCrypto: adjustedCryptoAmount,
        currency: deposit.currency
      });

      // ✅ VALIDATION: Ensure calculated amount is reasonable
      if (adjustedCryptoAmount <= 0 || !isFinite(adjustedCryptoAmount)) {
        throw new Error(`Invalid adjusted crypto amount calculated: ${adjustedCryptoAmount}`);
      }

      // ✅ VALIDATION: For USDT, adjusted crypto should match adjusted USD amount
      if (deposit.currency === 'USDT') {
        const difference = Math.abs(adjustedCryptoAmount - adjustedAmount);
        if (difference > 0.01) {
          console.error('⚠️ [TX] USDT adjustment mismatch detected!', {
            adjustedCryptoAmount,
            adjustedAmount,
            difference
          });
          throw new Error(
            `USDT adjustment validation failed. Expected ${adjustedAmount} USDT but calculated ${adjustedCryptoAmount} USDT`
          );
        }
      }

      // ✅ VALIDATION: Check if original deposit data is corrupted
      const conversionRate = parseFloat(deposit.conversionRate.toString());
      const usdtAmount = parseFloat(deposit.usdtAmount.toString());
      const expectedCryptoAmount = usdtAmount / conversionRate;
      const dataCorruptionDiff = Math.abs(originalCryptoAmount - expectedCryptoAmount) / expectedCryptoAmount;

      if (dataCorruptionDiff > 0.01) {
        console.error('⚠️ [TX] POTENTIAL DATA CORRUPTION DETECTED!', {
          depositId: deposit.id,
          originalCryptoAmount,
          expectedCryptoAmount,
          usdtAmount,
          conversionRate,
          corruptionPercent: (dataCorruptionDiff * 100).toFixed(2) + '%'
        });
        throw new Error(
          `Deposit data corruption detected. Original cryptoAmount (${originalCryptoAmount}) does not match expected value (${expectedCryptoAmount}). Please contact system administrator.`
        );
      }

      console.log('✅ [TX] All validations passed');

      const balance = await tx.balance.upsert({
        where: {
          walletAddress_currency: {
            walletAddress: deposit.walletAddress,
            currency: deposit.currency, // Use ACTUAL deposit currency (BTC, ETH, etc.)
          },
        },
        update: {
          amount: {
            increment: adjustedCryptoAmount,
          },
          realBalance: {
            increment: adjustedCryptoAmount,
          },
        },
        create: {
          walletAddress: deposit.walletAddress,
          currency: deposit.currency, // Use ACTUAL deposit currency
          amount: adjustedCryptoAmount,
          realBalance: adjustedCryptoAmount,
          realWinnings: 0,
          frozenBalance: 0,
        },
      });
      console.log('✅ [TX] Balance upserted:', {
        currency: deposit.currency,
        newAmount: balance.amount,
        newRealBalance: balance.realBalance
      });

      // Activity log will be created outside the transaction using logActivity helper
      console.log('✅ [TX] Activity log will be created after transaction');

      const elapsed = Date.now() - startTime;
      console.log(`⏱️  [TX] Transaction completed in ${elapsed}ms`);

      return { updatedDeposit, balance, adjustedCryptoAmount };
    }, {
      maxWait: 10000, // Maximum wait time for acquiring a connection
      timeout: 20000, // Maximum transaction execution time
    });

    console.log('✅ [API] Transaction completed successfully');
    console.log(`📊 [API] Deposit ${hasAdjustment ? 'adjusted and' : ''} approved:`, {
      depositId,
      originalAmount,
      adjustedAmount,
      adjustmentAmount: hasAdjustment ? adjustmentAmount : 0,
      userId: deposit.walletAddress,
      newBalance: result.balance.amount
    });

    // Get user info for activity logging
    const user = await prisma.user.findUnique({
      where: { walletAddress: deposit.walletAddress },
      select: {
        uid: true,
        kycSubmissions: {
          where: { status: 'approved' },
          select: { fullName: true, email: true },
          take: 1
        }
      }
    });

    const kycInfo = user?.kycSubmissions?.[0];

    // Emit realtime event for admin UI update
    realtimeEvents.emit(REALTIME_EVENTS.DEPOSIT_UPDATED, {
      id: depositId,
      status: 'adjusted'
    });

    // Log activity for Live Overview
    await logActivity({
      walletAddress: deposit.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'DEPOSIT_ADJUSTED',
      activityCategory: 'DEPOSIT',
      cryptoType: deposit.currency,
      amount: result.adjustedCryptoAmount,
      amountUsd: adjustedAmount,
      status: 'success',
      referenceId: deposit.id,
      adminId: admin.id,
      metadata: {
        hasAdjustment,
        originalAmount,
        adjustedAmount,
        adjustmentReason,
        adjustmentAmount: hasAdjustment ? adjustmentAmount : 0,
        adjustmentPercent: hasAdjustment ? ((adjustmentAmount / originalAmount) * 100).toFixed(2) : 0
      }
    });

    const successResponse = {
      success: true,
      message: hasAdjustment
        ? 'Deposit adjusted and approved successfully'
        : 'Deposit approved successfully',
      deposit: result.updatedDeposit,
      newBalance: result.balance.amount,
      adjustment: hasAdjustment
        ? {
          original: originalAmount,
          adjusted: adjustedAmount,
          difference: adjustmentAmount,
          percent: ((adjustmentAmount / originalAmount) * 100).toFixed(2),
        }
        : null,
    };

    console.log('📤 [API] Sending success response');
    return NextResponse.json(successResponse);

  } catch (error: any) {
    console.error('💥 [API] CRITICAL ERROR processing deposit adjustment:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    return NextResponse.json(
      {
        error: error.message || 'Failed to process deposit',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : undefined
      },
      { status: 500 }
    );
  }
}
