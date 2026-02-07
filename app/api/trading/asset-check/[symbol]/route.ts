export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// GET: Check if asset is enabled for trading
export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Asset symbol is required' },
        { status: 400 }
      );
    }

    // Find asset
    const asset = await prisma.assetTradingSettings.findUnique({
      where: { assetSymbol: symbol },
      select: {
        id: true,
        assetSymbol: true,
        assetType: true,
        assetName: true,
        isEnabled: true
      }
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    if (!asset.isEnabled) {
      return NextResponse.json(
        { error: 'Trading is not available for this asset' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      asset
    });
  } catch (error) {
    console.error('Error checking asset:', error);
    return NextResponse.json(
      { error: 'Failed to check asset availability' },
      { status: 500 }
    );
  }
}
