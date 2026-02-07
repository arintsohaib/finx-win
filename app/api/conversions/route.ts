export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { coinMarketCapService } from '@/lib/coinmarketcap';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activity-logger';
/**
 * Get conversion history
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const conversions = await prisma.conversion.findMany({
      where: { walletAddress: payload.walletAddress },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const serialized = conversions.map((c: any) => ({
      ...c,
      fromAmount: Number(c.fromAmount),
      toAmount: Number(c.toAmount),
      rate: Number(c.rate),
      fee: Number(c.fee),
      createdAt: c.createdAt.toISOString()
    }));

    return NextResponse.json({ conversions: serialized });
  } catch (error) {
    console.error('Error fetching conversions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversion history' },
      { status: 500 }
    );
  }
}

/**
 * Convert cryptocurrency - USDT-CENTRIC VERSION
 * All conversions go through USDT as the base currency
 * 
 * Supported flows:
 * 1. Crypto → USDT (e.g., BTC → USDT)
 * 2. USDT → Crypto (e.g., USDT → BTC)
 * 3. Crypto → Crypto (internally: Crypto → USDT → Crypto)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { fromCurrency, toCurrency, fromAmount } = await request.json();

    if (!fromCurrency || !toCurrency || !fromAmount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(fromAmount);
    
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Convert to string with fixed precision to avoid floating-point precision issues
    // Example: 0.1 (float) → "0.100000000000" (Decimal) might not equal stored "0.1" (Decimal)
    // Solution: Use toFixed() to normalize precision before Decimal conversion
    const normalizedAmount = amount.toFixed(18); // 18 decimal places for precision
    const amountDecimal = normalizedAmount;

    // CRITICAL: Block same currency conversion (especially USDT → USDT)
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return NextResponse.json(
        { error: 'Same currency conversion is not allowed. Please select different currencies.' },
        { status: 400 }
      );
    }

    // USDT-CENTRIC CONVERSION LOGIC
    // All rates are in USD/USDT terms
    
    let fromPriceInUSDT = 1; // Default for USDT
    let toPriceInUSDT = 1;   // Default for USDT
    let usdtIntermediateValue = 0;
    
    // Get prices from CoinMarketCap (outside transaction for performance)
    // Only fetch if currency is NOT USDT (USDT = 1 USD always)
    if (fromCurrency.toUpperCase() !== 'USDT') {
      const fromPrice = await coinMarketCapService.getPrice(fromCurrency.toUpperCase());
      if (!fromPrice || fromPrice.current_price <= 0) {
        return NextResponse.json(
          { error: `Unable to fetch exchange rate for ${fromCurrency}. Please try again.` },
          { status: 500 }
        );
      }
      fromPriceInUSDT = fromPrice.current_price;
    }
    
    if (toCurrency.toUpperCase() !== 'USDT') {
      const toPrice = await coinMarketCapService.getPrice(toCurrency.toUpperCase());
      if (!toPrice || toPrice.current_price <= 0) {
        return NextResponse.json(
          { error: `Unable to fetch exchange rate for ${toCurrency}. Please try again.` },
          { status: 500 }
        );
      }
      toPriceInUSDT = toPrice.current_price;
    }

    // Calculate USDT intermediate value (NO FEES)
    // Step 1: Convert FROM currency to USDT
    usdtIntermediateValue = amount * fromPriceInUSDT;
    
    // Step 2: Convert USDT to TO currency (no fees applied)
    const toAmount = usdtIntermediateValue / toPriceInUSDT;
    
    // Calculate effective rate for logging (FROM → TO directly)
    const rate = fromPriceInUSDT / toPriceInUSDT;

    // Perform conversion in transaction with proper locking
    await prisma.$transaction(async (tx: any) => {
      // CRITICAL FIX: Check balance INSIDE transaction with row-level locking
      // This prevents race conditions where multiple conversions check balance simultaneously
      const fromBalance = await tx.balance.findUnique({
        where: {
          walletAddress_currency: {
            walletAddress: payload.walletAddress,
            currency: fromCurrency.toUpperCase()
          }
        }
      });

      // Validate balance inside the locked transaction
      if (!fromBalance) {
        throw new Error('Source balance not found');
      }

      // FIXED: Use normalized Decimal for comparison
      console.log(`[CONVERSION] Balance check: required=${normalizedAmount}, available=${fromBalance.amount.toString()}, realBalance=${fromBalance.realBalance.toString()}`);
      
      if (fromBalance.amount.lessThan(amountDecimal)) {
        console.error(`[CONVERSION] Insufficient balance: need ${normalizedAmount}, have ${fromBalance.amount.toString()}`);
        throw new Error('Insufficient balance');
      }

      // Deduct from source currency with additional safety check
      // Using updateMany to ensure atomic update only if balance is sufficient
      const deductResult = await tx.balance.updateMany({
        where: {
          walletAddress: payload.walletAddress,
          currency: fromCurrency.toUpperCase(),
          amount: { gte: amountDecimal } // Use normalized Decimal
        },
        data: {
          amount: { decrement: amountDecimal },
          realBalance: { decrement: amountDecimal }
        }
      });

      // If no rows were updated, balance check failed
      if (deductResult.count === 0) {
        throw new Error('Insufficient balance for conversion');
      }

      // Add to destination currency (or create if doesn't exist)
      const toAmountDecimal = toAmount.toFixed(18); // Normalize
      await tx.balance.upsert({
        where: {
          walletAddress_currency: {
            walletAddress: payload.walletAddress,
            currency: toCurrency.toUpperCase()
          }
        },
        create: {
          walletAddress: payload.walletAddress,
          currency: toCurrency.toUpperCase(),
          amount: toAmountDecimal,
          realBalance: toAmountDecimal,
          realWinnings: 0,
          frozenBalance: 0
        },
        update: {
          amount: { increment: toAmountDecimal },
          realBalance: { increment: toAmountDecimal }
        }
      });

      // Record conversion with USDT-centric details (no fees)
      const rateDecimal = rate.toFixed(18);
      await tx.conversion.create({
        data: {
          walletAddress: payload.walletAddress,
          fromCurrency: fromCurrency.toUpperCase(),
          toCurrency: toCurrency.toUpperCase(),
          fromAmount: amountDecimal, // Use normalized Decimal
          toAmount: toAmountDecimal, // Use the same normalized value
          rate: rateDecimal,
          fee: 0, // No fees
          status: 'completed'
        }
      });

      // Create notification with USDT-centric details (no fee mention)
      await tx.notification.create({
        data: {
          walletAddress: payload.walletAddress,
          type: 'conversion',
          title: 'Conversion Successful',
          message: `Successfully converted ${amount.toFixed(8)} ${fromCurrency.toUpperCase()} (≈${usdtIntermediateValue.toFixed(2)} USDT) to ${toAmount.toFixed(8)} ${toCurrency.toUpperCase()}.`,
          link: '/transactions'
        }
      });
    });

    // Emit realtime events
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, { 
      walletAddress: payload.walletAddress 
    });

    // Get user info for activity logging
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
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

    // Log activity for Live Overview with USDT-centric details (no fees)
    await logActivity({
      walletAddress: payload.walletAddress,
      uid: user?.uid || 'unknown',
      userName: kycInfo?.fullName || undefined,
      userEmail: kycInfo?.email || undefined,
      activityType: 'CONVERSION',
      activityCategory: 'CONVERSION',
      cryptoType: 'USDT', // Platform uses USDT as base currency
      amount: usdtIntermediateValue, // USDT value
      amountUsd: usdtIntermediateValue, // Same as USDT
      status: 'success',
      referenceId: undefined,
      metadata: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        fromAmount: amount,
        toAmount,
        usdtIntermediateValue,
        rate,
        fromPriceInUSDT,
        toPriceInUSDT
      }
    });

    return NextResponse.json({ 
      success: true,
      conversion: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        fromAmount: amount,
        toAmount,
        rate,
        fee: 0, // No fees
        usdtIntermediateValue,
        fromPriceInUSDT,
        toPriceInUSDT
      }
    });

  } catch (error) {
    console.error('Error converting currency:', error);
    
    // Handle specific error messages from transaction
    if (error instanceof Error) {
      if (error.message === 'Insufficient balance' || 
          error.message === 'Insufficient balance for conversion' ||
          error.message === 'Source balance not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to convert currency' },
      { status: 500 }
    );
  }
}
