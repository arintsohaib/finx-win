export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Default settings to restore
const DEFAULT_SETTINGS = [
  { deliveryTime: '30s', profitLevel: 10, minUsdt: 10 },
  { deliveryTime: '60s', profitLevel: 15, minUsdt: 15 },
  { deliveryTime: '90s', profitLevel: 20, minUsdt: 20 },
  { deliveryTime: '5m', profitLevel: 30, minUsdt: 30 },
  { deliveryTime: '10m', profitLevel: 40, minUsdt: 40 },
  { deliveryTime: '15m', profitLevel: 50, minUsdt: 50 },
  { deliveryTime: '30m', profitLevel: 65, minUsdt: 70 },
  { deliveryTime: '1h', profitLevel: 80, minUsdt: 100 },
  { deliveryTime: '4h', profitLevel: 100, minUsdt: 150 },
  { deliveryTime: '1d', profitLevel: 150, minUsdt: 200 },
];

// POST: Reset all settings to defaults
export async function POST(request: NextRequest) {
  try {
    // Admin authentication is handled by middleware/session

    // Delete all existing settings
    await prisma.globalAssetSettings.deleteMany({});

    // Create default settings
    await prisma.globalAssetSettings.createMany({
      data: DEFAULT_SETTINGS,
    });

    // Note: Real-time updates will be handled by polling/refresh on client side
    
    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults successfully',
    });
  } catch (error) {
    console.error('Error resetting asset settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
}
