export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await requireAdmin(req);
    if (adminCheck instanceof NextResponse) {
      return adminCheck; // Return error response
    }

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category'); // 'all', 'trade', 'deposit', 'withdrawal', 'conversion', 'kyc'
    const searchTerm = searchParams.get('search'); // UID, name, email
    const cryptoType = searchParams.get('cryptoType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    if (category && category !== 'all') {
      where.activityCategory = category.toUpperCase();
    }

    if (searchTerm) {
      where.OR = [
        { uid: { contains: searchTerm, mode: 'insensitive' } },
        { userName: { contains: searchTerm, mode: 'insensitive' } },
        { userEmail: { contains: searchTerm, mode: 'insensitive' } },
        { walletAddress: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (cryptoType) {
      where.cryptoType = cryptoType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch activities with pagination
    const [activities, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              uid: true,
              walletAddress: true,
              kycStatus: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Parse metadata for each activity
    const activitiesWithParsedMetadata = activities.map((activity: any) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }));

    return NextResponse.json({
      activities: activitiesWithParsedMetadata,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  } catch (error) {
    console.error('[Admin Activities API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

