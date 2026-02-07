export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
/**
 * POST /api/admin/asset-management/create
 * Create a new trading asset
 */
export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { symbol, name, type, isEnabled, sortOrder } = await request.json();

        // Validation
        if (!symbol || !name || !type) {
            return NextResponse.json(
                { error: 'Symbol, name, and type are required' },
                { status: 400 }
            );
        }

        // Validate symbol format
        if (!/^[A-Z0-9]+$/.test(symbol)) {
            return NextResponse.json(
                { error: 'Symbol must contain only uppercase letters and numbers' },
                { status: 400 }
            );
        }

        // Validate type
        if (!['CRYPTO', 'FOREX', 'PRECIOUS_METAL'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid asset type. Must be CRYPTO, FOREX, or PRECIOUS_METAL' },
                { status: 400 }
            );
        }

        // Check for duplicate symbol
        const existing = await prisma.assetTradingSettings.findUnique({
            where: { assetSymbol: symbol },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Asset with symbol '${symbol}' already exists` },
                { status: 409 }
            );
        }

        // Auto-calculate sort order if not provided
        let finalSortOrder = sortOrder;
        if (!finalSortOrder) {
            const maxSort = await prisma.assetTradingSettings.findFirst({
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true },
            });
            finalSortOrder = (maxSort?.sortOrder || 0) + 1;
        }

        // Create asset
        const asset = await prisma.assetTradingSettings.create({
            data: {
                assetSymbol: symbol,
                assetName: name,
                assetType: type,
                isEnabled: isEnabled ?? true,
                sortOrder: finalSortOrder,
            },
        });

        return NextResponse.json({ success: true, asset }, { status: 201 });
    } catch (error) {
        console.error('[Asset Management API] Error creating asset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create asset' },
            { status: 500 }
        );
    }
}
