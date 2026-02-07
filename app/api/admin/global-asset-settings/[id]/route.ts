export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, AdminJWTPayload, hasPermission, PERMISSIONS } from '@/lib/admin-auth';
// PUT: Update a global asset setting
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // ✅ SECURITY: Use cookie-based authentication (same as other admin routes)
    const adminResult = await requireAdmin(request);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // ✅ SECURITY: Check MANAGE_TRADE_SETTINGS permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_TRADE_SETTINGS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { deliveryTime, profitLevel, minUsdt } = body;

    // Validation
    if (!deliveryTime || typeof deliveryTime !== 'string') {
      return NextResponse.json(
        { error: 'Delivery time is required and must be a string' },
        { status: 400 }
      );
    }

    if (profitLevel === undefined || profitLevel === null) {
      return NextResponse.json(
        { error: 'Profit level is required' },
        { status: 400 }
      );
    }

    if (minUsdt === undefined || minUsdt === null) {
      return NextResponse.json(
        { error: 'Minimum USDT is required' },
        { status: 400 }
      );
    }

    // Check if setting exists
    const existingSetting = await prisma.globalAssetSettings.findUnique({
      where: { id },
    });

    if (!existingSetting) {
      return NextResponse.json(
        { error: 'Global asset setting not found' },
        { status: 404 }
      );
    }

    // Check for duplicate (excluding the current setting)
    const duplicateSetting = await prisma.globalAssetSettings.findFirst({
      where: {
        id: { not: id },
        deliveryTime: deliveryTime.trim(),
        profitLevel,
        minUsdt,
      },
    });

    if (duplicateSetting) {
      return NextResponse.json(
        { error: 'This combination of delivery time, profit level, and minimum USDT already exists' },
        { status: 409 }
      );
    }

    // Update setting
    const updatedSetting = await prisma.globalAssetSettings.update({
      where: { id },
      data: {
        deliveryTime: deliveryTime.trim(),
        profitLevel,
        minUsdt,
      },
    });

    return NextResponse.json({
      message: 'Global asset setting updated successfully',
      setting: updatedSetting,
    });
  } catch (error) {
    console.error('Error updating global asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to update global asset setting' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a global asset setting
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // ✅ SECURITY: Use cookie-based authentication (same as other admin routes)
    const adminResult = await requireAdmin(request);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // ✅ SECURITY: Check MANAGE_TRADE_SETTINGS permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_TRADE_SETTINGS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if setting exists
    const existingSetting = await prisma.globalAssetSettings.findUnique({
      where: { id },
    });

    if (!existingSetting) {
      return NextResponse.json(
        { error: 'Global asset setting not found' },
        { status: 404 }
      );
    }

    // Delete setting
    await prisma.globalAssetSettings.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Global asset setting deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting global asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete global asset setting' },
      { status: 500 }
    );
  }
}
