export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// PUT: Update existing delivery time configuration
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // Admin authentication is handled by middleware/session

    const body = await request.json();
    const { profitLevel, minUsdt } = body;

    // Validate input
    if (typeof profitLevel !== 'number' || typeof minUsdt !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    if (profitLevel <= 0 || profitLevel > 1000) {
      return NextResponse.json(
        { error: 'Profit level must be between 0.01 and 1000' },
        { status: 400 }
      );
    }

    if (minUsdt <= 0) {
      return NextResponse.json(
        { error: 'Minimum balance must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if setting exists
    const existing = await prisma.globalAssetSettings.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Update setting (delivery time cannot be changed)
    const updatedSetting = await prisma.globalAssetSettings.update({
      where: { id },
      data: {
        profitLevel,
        minUsdt,
        updatedAt: new Date(),
      },
    });

    // Note: Real-time updates will be handled by polling/refresh on client side

    return NextResponse.json({
      success: true,
      setting: {
        id: updatedSetting.id,
        deliveryTime: updatedSetting.deliveryTime,
        profitLevel: Number(updatedSetting.profitLevel),
        minUsdt: Number(updatedSetting.minUsdt),
      },
    });
  } catch (error) {
    console.error('Error updating asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a delivery time configuration
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // Admin authentication is handled by middleware/session

    // Check if setting exists
    const existing = await prisma.globalAssetSettings.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Delete setting
    await prisma.globalAssetSettings.delete({
      where: { id }
    });

    // Note: Real-time updates will be handled by polling/refresh on client side

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
