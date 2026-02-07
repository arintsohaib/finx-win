export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
/**
 * GET /api/trading/configs
 * Returns global asset settings (delivery times and profit levels)
 */
export async function GET() {
  try {
    const globalSettings = await prisma.globalAssetSettings.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      globalSettings: globalSettings.map((setting: any) => ({
        id: setting.id,
        deliveryTime: setting.deliveryTime,
        profitLevel: parseFloat(setting.profitLevel.toString()),
        minUsdt: parseFloat(setting.minUsdt.toString()),
        createdAt: setting.createdAt.toISOString(),
        updatedAt: setting.updatedAt.toISOString(),
      }))
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global settings' },
      { status: 500 }
    );
  }
}
