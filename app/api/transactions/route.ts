export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const revalidate = 0;

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
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    } : {};

    // Fetch different types of transactions based on category
    let transactions: any[] = [];

    if (!category || category === 'all' || category === 'deposit') {
      const deposits = await prisma.deposit.findMany({
        where: {
          walletAddress: payload.walletAddress,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...deposits.map((d: any) => ({
        id: d.id,
        type: 'deposit',
        currency: d.currency,
        amount: d.cryptoAmount?.toString() || '0',
        usdtAmount: d.usdtAmount?.toString() || '0',
        status: d.status,
        txHash: d.txHash,
        paymentProof: d.paymentScreenshot,
        adminNote: d.adminNotes,
        adjustedAmount: d.adjustedAmount,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.createdAt.toISOString(),
        approvedAt: d.approvedAt?.toISOString(),
        rejectedAt: d.rejectedAt?.toISOString(),
      })));
    }

    if (!category || category === 'all' || category === 'withdrawal') {
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          walletAddress: payload.walletAddress,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...withdrawals.map((w: any) => ({
        id: w.id,
        type: 'withdrawal',
        currency: w.currency,
        amount: w.cryptoAmount?.toString() || '0',
        usdtAmount: w.usdtAmount?.toString() || '0',
        status: w.status,
        txHash: w.txHash,
        toAddress: w.destinationAddress,
        adminNote: w.adminNotes,
        fee: w.fee?.toString() || '0',
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.createdAt.toISOString(),
        processedAt: w.processedAt?.toISOString(),
        rejectedAt: w.rejectedAt?.toISOString(),
      })));
    }

    if (!category || category === 'all' || category === 'conversion') {
      const conversions = await prisma.conversion.findMany({
        where: {
          walletAddress: payload.walletAddress,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...conversions.map((c: any) => ({
        id: c.id,
        type: 'conversion',
        fromCurrency: c.fromCurrency,
        toCurrency: c.toCurrency,
        fromAmount: c.fromAmount?.toString() || '0',
        toAmount: c.toAmount?.toString() || '0',
        rate: c.rate?.toString() || '0',
        status: 'completed',
        createdAt: c.createdAt.toISOString(),
      })));
    }

    if (!category || category === 'all' || category === 'trade') {
      const trades = await prisma.trade.findMany({
        where: {
          walletAddress: payload.walletAddress,
          status: 'finished',
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...trades.map((t: any) => ({
        id: t.id,
        type: t.result === 'win' ? 'trade-win' : 'trade-loss',
        asset: t.asset,
        amount: t.pnl?.toString() || '0',
        investmentAmount: t.amountUsd?.toString() || '0',
        result: t.result,
        entryPrice: t.entryPrice?.toString() || '0',
        exitPrice: t.exitPrice?.toString() || '0',
        status: 'completed',
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.createdAt.toISOString(),
        closedAt: t.closedAt?.toISOString(),
      })));
    }

    // Sort all transactions by date
    transactions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply limit after combining
    const paginatedTransactions = transactions.slice(0, limit);
    const hasMore = transactions.length > limit;

    // Set no-cache headers
    const response = NextResponse.json({
      success: true,
      data: paginatedTransactions,
      hasMore,
      total: transactions.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
