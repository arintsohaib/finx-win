export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, AdminJWTPayload, hasPermission, PERMISSIONS } from '@/lib/admin-auth';
// GET: List all global asset settings
export async function GET(request: NextRequest) {
  try {
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

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Fetch settings with pagination
    const [settings, total] = await Promise.all([
      prisma.globalAssetSettings.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.globalAssetSettings.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      settings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching global asset settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global asset settings' },
      { status: 500 }
    );
  }
}

// POST: Create a new global asset setting
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate
    const existingSetting = await prisma.globalAssetSettings.findFirst({
      where: {
        deliveryTime: deliveryTime.trim(),
        profitLevel,
        minUsdt,
      },
    });

    if (existingSetting) {
      return NextResponse.json(
        { error: 'This combination of delivery time, profit level, and minimum USDT already exists' },
        { status: 409 }
      );
    }

    // Create new setting
    const newSetting = await prisma.globalAssetSettings.create({
      data: {
        deliveryTime: deliveryTime.trim(),
        profitLevel,
        minUsdt,
      },
    });

    return NextResponse.json({
      message: 'Global asset setting created successfully',
      setting: newSetting,
    });
  } catch (error) {
    console.error('Error creating global asset setting:', error);
    return NextResponse.json(
      { error: 'Failed to create global asset setting' },
      { status: 500 }
    );
  }
}
