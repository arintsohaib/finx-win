export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const walletAddress = searchParams.get('walletAddress');

    // Build date filter
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    } : {};

    // Build wallet filter
    const walletFilter = walletAddress ? { walletAddress } : {};

    // Fetch different types of transactions based on category
    let transactions: any[] = [];

    if (!category || category === 'all' || category === 'deposit') {
      const deposits = await prisma.deposit.findMany({
        where: {
          ...walletFilter,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...deposits.map((d: any) => ({
        id: d.id,
        type: 'deposit',
        walletAddress: d.walletAddress,
        currency: d.currency,
        amount: d.amount?.toString() || '0',
        usdtAmount: d.usdtAmount?.toString() || '0',
        status: d.status,
        txHash: d.txHash,
        paymentProof: d.paymentProof,
        adminNote: d.adminNote,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })));
    }

    if (!category || category === 'all' || category === 'withdrawal') {
      const withdrawals = await prisma.withdrawal.findMany({
        where: {
          ...walletFilter,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...withdrawals.map((w: any) => ({
        id: w.id,
        type: 'withdrawal',
        walletAddress: w.walletAddress,
        currency: w.currency,
        amount: w.amount?.toString() || '0',
        usdtAmount: w.usdtAmount?.toString() || '0',
        status: w.status,
        txHash: w.txHash,
        toAddress: w.toAddress,
        adminNote: w.adminNote,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })));
    }

    if (!category || category === 'all' || category === 'conversion') {
      const conversions = await prisma.conversion.findMany({
        where: {
          ...walletFilter,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      transactions.push(...conversions.map((c: any) => ({
        id: c.id,
        type: 'conversion',
        walletAddress: c.walletAddress,
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
          ...walletFilter,
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
        walletAddress: t.walletAddress,
        asset: t.asset,
        amount: t.pnl?.toString() || '0',
        investmentAmount: t.investmentAmount?.toString() || '0',
        result: t.result,
        entryPrice: t.entryPrice?.toString() || '0',
        exitPrice: t.exitPrice?.toString() || '0',
        status: 'completed',
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })));
    }

    // Sort all transactions by date
    transactions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply limit after combining
    const paginatedTransactions = transactions.slice(0, limit);
    const hasMore = transactions.length > limit;

    // Get user details for each unique wallet address
    const uniqueWallets = [...new Set(paginatedTransactions.map((t: any) => t.walletAddress))];
    const users = await prisma.user.findMany({
      where: {
        walletAddress: {
          in: uniqueWallets,
        },
      },
      select: {
        walletAddress: true,
        uid: true,
        createdAt: true,
      },
    });

    const userMap = new Map(users.map((u: any) => [u.walletAddress, u]));

    // Enrich transactions with user info
    const enrichedTransactions = paginatedTransactions.map((tx: any) => ({
      ...tx,
      user: userMap.get(tx.walletAddress) || null,
    }));

    // Set no-cache headers
    const response = NextResponse.json({
      success: true,
      data: enrichedTransactions,
      hasMore,
      total: transactions.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Admin fetch transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
