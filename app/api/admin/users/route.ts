export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, hasPermission, PERMISSIONS, AdminJWTPayload } from '@/lib/admin-auth';
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const adminResult = await requireAdmin(req);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // ✅ SECURITY: Check MANAGE_USERS permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const unassigned = searchParams.get('unassigned') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build search query
    const where: any = {};

    // Search by UID, wallet address, full name (from KYC), or email (from KYC)
    if (search) {
      where.OR = [
        { uid: { contains: search } },
        { walletAddress: { contains: search, mode: 'insensitive' as const } },
        // Search in KYC submissions
        {
          kycSubmissions: {
            some: {
              fullName: { contains: search, mode: 'insensitive' as const }
            }
          }
        },
        {
          kycSubmissions: {
            some: {
              email: { contains: search, mode: 'insensitive' as const }
            }
          }
        },
      ];
    }

    // Filter by employee
    if (employeeId) {
      where.assignedEmployeeId = employeeId;
    } else if (unassigned) {
      where.assignedEmployeeId = null;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              trades: true,
              deposits: true,
              withdrawals: true,
            },
          },
          balances: {
            select: {
              currency: true,
              amount: true,
            },
          },
          assignedEmployee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          kycSubmissions: {
            where: {
              status: 'approved',
            },
            select: {
              fullName: true,
              email: true,
              status: true,
            },
            orderBy: {
              submittedAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
