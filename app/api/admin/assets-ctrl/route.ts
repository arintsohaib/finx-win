export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// GET: Fetch all global asset settings (already handled by /api/trading/global-settings)
// This endpoint is for admin-specific operations

// POST: Create new delivery time configuration
export async function POST(request: NextRequest) {
  try {
    // Admin authentication is handled by middleware/session

    const body = await request.json();
    const { durationValue, durationUnit, profitLevel, minUsdt } = body;

    // Validate input
    if (!durationValue || !durationUnit || typeof profitLevel !== 'number' || typeof minUsdt !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    if (durationValue <= 0) {
      return NextResponse.json(
        { error: 'Duration value must be greater than 0' },
        { status: 400 }
      );
    }

    if (!['s', 'm', 'h', 'd', 'y'].includes(durationUnit)) {
      return NextResponse.json(
        { error: 'Invalid duration unit' },
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

    // Calculate durationSeconds
    const unitMultipliers: Record<string, number> = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400,
      'y': 31536000,
    };
    const durationSeconds = durationValue * unitMultipliers[durationUnit];

    // Auto-generate deliveryTime (e.g., "30s", "5m", "1h")
    const deliveryTime = `${durationValue}${durationUnit}`;

    // Check for duplicate duration (by seconds)
    const existing = await prisma.globalAssetSettings.findFirst({
      where: { durationSeconds }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This delivery time already exists' },
        { status: 400 }
      );
    }

    // Create new setting
    const newSetting = await prisma.globalAssetSettings.create({
      data: {
        deliveryTime,
        durationValue,
        durationUnit,
        durationSeconds,
        profitLevel,
        minUsdt,
      },
    });

    // Note: Real-time updates will be handled by WebSocket broadcast
    
    return NextResponse.json({
      success: true,
      setting: {
        id: newSetting.id,
        deliveryTime: newSetting.deliveryTime,
        durationValue: newSetting.durationValue,
        durationUnit: newSetting.durationUnit,
        durationSeconds: newSetting.durationSeconds,
        profitLevel: Number(newSetting.profitLevel),
        minUsdt: Number(newSetting.minUsdt),
      },
    });
  } catch (error) {
    console.error('Error creating asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to create setting' },
      { status: 500 }
    );
  }
}
