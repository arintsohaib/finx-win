export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
/**
 * GET /api/trading/asset-settings/[symbol]
 * Returns asset settings combined with global trading settings
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Asset symbol is required' },
        { status: 400 }
      );
    }

    // Check if asset exists and is enabled
    const asset = await prisma.assetTradingSettings.findUnique({
      where: { assetSymbol: symbol.toUpperCase() }
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    if (!asset.isEnabled) {
      return NextResponse.json(
        { error: 'Trading is disabled for this asset' },
        { status: 403 }
      );
    }

    // Get global settings (delivery times and profit levels)
    const globalSettings = await prisma.globalAssetSettings.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group settings by delivery time
    const deliveryTimeMap = new Map<string, Array<{ profitLevel: number; minUsdt: number }>>();
    
    globalSettings.forEach((setting: any) => {
      const existing = deliveryTimeMap.get(setting.deliveryTime) || [];
      existing.push({
        profitLevel: parseFloat(setting.profitLevel.toString()),
        minUsdt: parseFloat(setting.minUsdt.toString())
      });
      deliveryTimeMap.set(setting.deliveryTime, existing);
    });

    // Extract unique delivery times
    const deliveryTimes = Array.from(deliveryTimeMap.keys());

    // Format profit levels for each delivery time
    const profitLevels = Array.from(deliveryTimeMap.entries()).map(([duration, levels]) => ({
      duration,
      levels: levels.map((l: any) => ({
        percentage: l.profitLevel,
        minUsdt: l.minUsdt
      }))
    }));

    return NextResponse.json({
      success: true,
      settings: {
        assetSymbol: asset.assetSymbol,
        assetName: asset.assetName,
        assetType: asset.assetType,
        deliveryTimes,
        profitLevels,
        globalSettings: globalSettings.map((s: any) => ({
          id: s.id,
          deliveryTime: s.deliveryTime,
          profitLevel: parseFloat(s.profitLevel.toString()),
          minUsdt: parseFloat(s.minUsdt.toString())
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching asset settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset settings' },
      { status: 500 }
    );
  }
}
