export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// GET: Fetch all global trading settings
export async function GET(request: NextRequest) {
  try {
    // Fetch all global settings ordered by durationSeconds (ascending - shortest to longest)
    const settings = await prisma.globalAssetSettings.findMany({
      orderBy: { durationSeconds: 'asc' },
      select: {
        id: true,
        deliveryTime: true,
        durationValue: true,
        durationUnit: true,
        durationSeconds: true,
        profitLevel: true,
        minUsdt: true
      }
    });

    // Format the response
    const formattedSettings = settings.map((s: any) => ({
      id: s.id,
      deliveryTime: s.deliveryTime,
      durationValue: s.durationValue,
      durationUnit: s.durationUnit,
      durationSeconds: s.durationSeconds,
      profitLevel: Number(s.profitLevel),
      minUsdt: Number(s.minUsdt)
    }));

    return NextResponse.json({
      success: true,
      settings: formattedSettings
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global settings' },
      { status: 500 }
    );
  }
}
