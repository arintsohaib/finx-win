export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
/**
 * PUT /api/admin/asset-management/[id]
 * Update an existing asset
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { name, sortOrder } = await request.json();

        // Update asset
        const asset = await prisma.assetTradingSettings.update({
            where: { id },
            data: {
                ...(name && { assetName: name }),
                ...(sortOrder !== undefined && { sortOrder: sortOrder }),
            },
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

/**
 * DELETE /api/admin/asset-management/[id]
 * Delete an asset
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        // Delete asset
        await prisma.assetTradingSettings.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Asset Management API] Error deleting asset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete asset' },
            { status: 500 }
        );
    }
}
