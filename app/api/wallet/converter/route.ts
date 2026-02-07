export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { MIN_CONVERSION_USDT, TRADING_CURRENCY } from '@/lib/wallet-config';
import { realtimeEvents, REALTIME_EVENTS } from '@/lib/realtime-events';
import { coinMarketCapService } from '@/lib/coinmarketcap';
// GET - Get conversion rate and preview
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from')?.toUpperCase();
    const toCurrency = searchParams.get('to')?.toUpperCase() || TRADING_CURRENCY;
    const amountStr = searchParams.get('amount') || '0';
    const amount = parseFloat(amountStr);
    const mode = searchParams.get('mode') || 'from'; // 'from' (default) or 'to'

    if (!fromCurrency || fromCurrency === toCurrency) {
      return NextResponse.json({ error: 'Invalid currency pair' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Fetch current exchange rates directly from service (bypassing internal HTTP)
    let cryptoPrices;
    try {
      cryptoPrices = await coinMarketCapService.getPrices();
    } catch (err) {
      console.error('[Converter API] Failed to fetch prices from service:', err);
      return NextResponse.json({ error: 'Exchange rate service currently unavailable' }, { status: 503 });
    }

    const fromPriceData = cryptoPrices.find(p => p.symbol === fromCurrency);
    const toPriceData = cryptoPrices.find(p => p.symbol === toCurrency);

    const fromPrice = fromPriceData?.current_price || 0;
    const toPrice = toPriceData?.current_price || (toCurrency === TRADING_CURRENCY ? 1 : 0);

    if (fromPrice === 0 || toPrice === 0) {
      console.error('[Converter API] Invalid rates:', { fromCurrency, fromPrice, toCurrency, toPrice });
      return NextResponse.json({ error: 'Invalid or unavailable exchange rate' }, { status: 500 });
    }

    // Calculate conversion (no fees)
    const rate = fromPrice / toPrice;
    let fromAmount: number, toAmount: number;

    if (mode === 'to') {
      toAmount = amount;
      fromAmount = toAmount / rate;
    } else {
      fromAmount = amount;
      toAmount = fromAmount * rate;
    }

    // Check user balance (after we know exactly how much fromCurrency is needed)
    const balance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress: payload.walletAddress,
          currency: fromCurrency,
        },
      },
    });

    if (!balance || parseFloat(balance.realBalance.toString()) < fromAmount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        available: balance ? parseFloat(balance.realBalance.toString()) : 0,
        required: fromAmount,
      }, { status: 400 });
    }

    const usdValue = fromAmount * fromPrice;
    const fee = 0;

    // Check minimum conversion amount (in USD/USDT)
    if (usdValue < MIN_CONVERSION_USDT) {
      return NextResponse.json({
        error: `Minimum conversion amount is $${MIN_CONVERSION_USDT} USD equivalent`,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      preview: {
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        rate,
        fee,
        feePercent: 0,
        usdValue,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Conversion preview error:', error);
    return NextResponse.json({ error: 'Failed to preview conversion' }, { status: 500 });
  }
}

// POST - Execute conversion
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { fromCurrency, toCurrency = TRADING_CURRENCY, amount } = body;

    if (!fromCurrency || fromCurrency === toCurrency || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid conversion parameters' }, { status: 400 });
    }

    // Get conversion preview
    const previewUrl = `${request.nextUrl.origin}/api/wallet/converter?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`;
    const previewResponse = await fetch(previewUrl, {
      headers: { Cookie: request.headers.get('cookie') || '' },
    });

    const previewData = await previewResponse.json();

    if (!previewData.success) {
      console.error('[Converter POST] Preview failed:', previewData.error);
      return NextResponse.json({
        error: previewData.error || 'Conversion preview failed',
      }, { status: 400 });
    }

    const { preview } = previewData;

    // Execute conversion in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Deduct from source currency realBalance (deposited crypto)
      const fromBalance = await tx.balance.findUnique({
        where: {
          walletAddress_currency: {
            walletAddress: payload.walletAddress,
            currency: fromCurrency,
          },
        },
      });

      if (!fromBalance || parseFloat(fromBalance.realBalance.toString()) < amount) {
        throw new Error('Insufficient balance');
      }

      await tx.balance.update({
        where: {
          walletAddress_currency: {
            walletAddress: payload.walletAddress,
            currency: fromCurrency,
          },
        },
        data: {
          // Synchronize both fields: realBalance for the source and amount (display balance)
          amount: {
            decrement: new Decimal(amount),
          },
          realBalance: {
            decrement: new Decimal(amount),
          },
        },
      });

      // Add to destination currency (USDT)
      const toBalance = await tx.balance.findUnique({
        where: {
          walletAddress_currency: {
            walletAddress: payload.walletAddress,
            currency: toCurrency,
          },
        },
      });

      if (toBalance) {
        await tx.balance.update({
          where: {
            walletAddress_currency: {
              walletAddress: payload.walletAddress,
              currency: toCurrency,
            },
          },
          data: {
            // Keep source and display balance in sync for USDT
            amount: {
              increment: new Decimal(preview.toAmount),
            },
            realBalance: {
              increment: new Decimal(preview.toAmount),
            },
          },
        });
      } else {
        await tx.balance.create({
          data: {
            walletAddress: payload.walletAddress,
            currency: toCurrency,
            amount: new Decimal(preview.toAmount),
            realBalance: new Decimal(preview.toAmount),
            realWinnings: new Decimal(0),
            frozenBalance: new Decimal(0),
          },
        });
      }

      // Record conversion
      const conversion = await tx.conversion.create({
        data: {
          walletAddress: payload.walletAddress,
          fromCurrency,
          toCurrency,
          fromAmount: new Decimal(amount),
          toAmount: new Decimal(preview.toAmount),
          rate: new Decimal(preview.rate),
          fee: new Decimal(preview.fee),
          status: 'completed',
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          walletAddress: payload.walletAddress,
          type: 'conversion',
          title: 'Conversion Successful',
          message: `Converted ${amount} ${fromCurrency} to ${preview.toAmount.toFixed(2)} ${toCurrency}`,
          link: '/transactions',
        },
      });

      return conversion;
    });

    // Emit real-time updates
    realtimeEvents.emit(`${REALTIME_EVENTS.USER_BALANCE_UPDATED}:${payload.walletAddress}`, { walletAddress: payload.walletAddress });
    realtimeEvents.emit(`conversion:completed:${payload.walletAddress}`, { walletAddress: payload.walletAddress });

    return NextResponse.json({
      success: true,
      message: 'Conversion completed successfully',
      conversion: {
        id: result.id,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
        fromAmount: parseFloat(result.fromAmount.toString()),
        toAmount: parseFloat(result.toAmount.toString()),
        fee: parseFloat(result.fee.toString()),
        createdAt: result.createdAt,
      },
    });

  } catch (error) {
    console.error('Conversion execution error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to execute conversion',
    }, { status: 500 });
  }
}
