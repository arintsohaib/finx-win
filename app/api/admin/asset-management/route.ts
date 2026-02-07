export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
/**
 * GET /api/admin/asset-management
 * Returns all trading assets for admin management
 */
export async function GET(request: NextRequest) {
    try {
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const assets = await prisma.assetTradingSettings.findMany({
            orderBy: [
                { assetType: 'asc' },
                { sortOrder: 'asc' },
            ],
        });

        return NextResponse.json({ success: true, assets });
    } catch (error) {
        console.error('[Asset Management API] Error fetching assets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch assets' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/asset-management
 * Update an asset (enable/disable, etc.)
 */
export async function PUT(request: NextRequest) {
    try {
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { id, isEnabled } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        const asset = await prisma.assetTradingSettings.update({
            where: { id },
            data: { isEnabled },
        });

        return NextResponse.json({ success: true, asset });
    } catch (error) {
        console.error('[Asset Management API] Error updating asset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update asset' },
            { status: 500 }
        );
    }
}
