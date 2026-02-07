
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const token = request.cookies.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { id } = await params;

        const trade = await prisma.trade.findUnique({
            where: {
                id,
                walletAddress: payload.walletAddress
            }
        });

        if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

        const serializedTrade = {
            id: trade.id,
            asset: trade.asset,
            side: trade.side,
            entryPrice: trade.entryPrice.toString(),
            amountUsd: trade.amountUsd.toString(),
            duration: trade.duration,
            profitMultiplier: trade.profitMultiplier,
            fee: trade.fee.toString(),
            status: trade.status,
            result: trade.result,
            createdAt: trade.createdAt,
            expiresAt: trade.expiresAt,
            closedAt: trade.closedAt,
            exitPrice: trade.exitPrice?.toString() || null,
            pnl: trade.pnl?.toString() || null
        };

        return NextResponse.json({
            success: true,
            trade: serializedTrade
        });

    } catch (error) {
        console.error('Trade fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
    }
}
