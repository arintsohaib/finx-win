export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { settingsCache } from '@/lib/settings-cache';
// GET: Fetch global trade settings
export async function GET() {
  try {
    // Fetch all global settings
    const settings = await prisma.adminSettings.findMany({
      where: {
        key: {
          in: ['global_trade_mode', 'global_win_percentage', 'global_loss_percentage']
        }
      }
    });

    // Convert to object
    const settingsObj: any = {};
    settings.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json({
      globalMode: settingsObj.global_trade_mode || 'disabled',
      globalWinPercentage: settingsObj.global_win_percentage || '2.5',
      globalLossPercentage: settingsObj.global_loss_percentage || '0.002',
    });

  } catch (error) {
    console.error('Error fetching global trade settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global trade settings' },
      { status: 500 }
    );
  }
}

// POST: Update global trade settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { globalMode, globalWinPercentage, globalLossPercentage } = body;

    // Validate mode
    if (!['disabled', 'automatic', 'win', 'loss', 'custom'].includes(globalMode)) {
      return NextResponse.json(
        { error: 'Invalid global mode' },
        { status: 400 }
      );
    }

    // Validate percentages if custom mode
    if (globalMode === 'custom') {
      const winPercent = parseFloat(globalWinPercentage);
      const lossPercent = parseFloat(globalLossPercentage);

      if (isNaN(winPercent) || winPercent < 0.01 || winPercent > 99.99) {
        return NextResponse.json(
          { error: 'Win percentage must be between 0.01% and 99.99%' },
          { status: 400 }
        );
      }

      if (isNaN(lossPercent) || lossPercent < 0.001 || lossPercent > 99.99) {
        return NextResponse.json(
          { error: 'Loss percentage must be between 0.001% and 99.99%' },
          { status: 400 }
        );
      }
    }

    // Update or create settings
    await Promise.all([
      prisma.adminSettings.upsert({
        where: { key: 'global_trade_mode' },
        update: { 
          value: globalMode,
          description: 'Global trade control mode that applies to all users'
        },
        create: { 
          key: 'global_trade_mode',
          value: globalMode,
          description: 'Global trade control mode that applies to all users'
        }
      }),
      prisma.adminSettings.upsert({
        where: { key: 'global_win_percentage' },
        update: { 
          value: globalWinPercentage.toString(),
          description: 'Global custom win price movement percentage'
        },
        create: { 
          key: 'global_win_percentage',
          value: globalWinPercentage.toString(),
          description: 'Global custom win price movement percentage'
        }
      }),
      prisma.adminSettings.upsert({
        where: { key: 'global_loss_percentage' },
        update: { 
          value: globalLossPercentage.toString(),
          description: 'Global custom loss price movement percentage'
        },
        create: { 
          key: 'global_loss_percentage',
          value: globalLossPercentage.toString(),
          description: 'Global custom loss price movement percentage'
        }
      })
    ]);

    // CRITICAL: Invalidate cache to ensure fresh settings are loaded immediately
    settingsCache.invalidate('global_trade_settings');
    console.log('[Settings Cache] Invalidated global_trade_settings cache');

    console.log(`[ADMIN ACTION] Global trade settings updated: mode=${globalMode}, win=${globalWinPercentage}%, loss=${globalLossPercentage}%`);

    return NextResponse.json({
      success: true,
      message: 'Global trade settings updated successfully',
      settings: {
        globalMode,
        globalWinPercentage,
        globalLossPercentage
      }
    });

  } catch (error) {
    console.error('Error updating global trade settings:', error);
    return NextResponse.json(
      { error: 'Failed to update global trade settings' },
      { status: 500 }
    );
  }
}
