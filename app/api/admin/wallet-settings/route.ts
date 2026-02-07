export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
/**
 * GET /api/admin/wallet-settings
 * Fetch wallet system settings
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.walletSettings.findMany();

    const settingsMap: Record<string, string> = {};
    settings.forEach((setting: any) => {
      settingsMap[setting.key] = setting.value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Error fetching wallet settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wallet-settings
 * Update wallet system settings
 */
export async function POST(request: NextRequest) {
  try {
    const { key, value, description } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const setting = await prisma.walletSettings.upsert({
      where: { key },
      create: {
        key,
        value: String(value),
        description,
      },
      update: {
        value: String(value),
        description: description || undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      setting: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
  } catch (error) {
    console.error('Error updating wallet setting:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet setting' },
      { status: 500 }
    );
  }
}
