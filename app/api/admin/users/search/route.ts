export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, PERMISSIONS, AdminJWTPayload } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
/**
 * GET /api/admin/users/search
 * Search for KYC-verified users by email, UID, wallet, or name
 * Query params: ?q=searchTerm&type=email|uid|wallet|name
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(req);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // Check permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get search parameters
    const searchParams = req.nextUrl.searchParams;
    const searchTerm = searchParams.get('q')?.trim() || '';
    const searchType = searchParams.get('type') || 'email';

    // Validate search term (minimum 2 characters)
    if (searchTerm.length < 2) {
      return NextResponse.json(
        { error: 'Search term must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Build search query based on type
    // Only search users with approved KYC submissions
    let whereClause: any = {
      kycStatus: 'approved', // Only search KYC-approved users
      kycSubmissions: {
        some: {
          status: 'approved',
        },
      },
    };

    switch (searchType) {
      case 'email':
        whereClause.kycSubmissions = {
          some: {
            status: 'approved',
            email: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        };
        break;

      case 'uid':
        // UID is exact match or starts with
        whereClause.uid = {
          startsWith: searchTerm,
        };
        break;

      case 'wallet':
        whereClause.walletAddress = {
          contains: searchTerm,
          mode: 'insensitive',
        };
        break;

      case 'name':
        whereClause.kycSubmissions = {
          some: {
            status: 'approved',
            fullName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        };
        break;

      default:
        // Default: search all fields
        whereClause = {
          kycStatus: 'approved',
          OR: [
            {
              kycSubmissions: {
                some: {
                  status: 'approved',
                  email: { contains: searchTerm, mode: 'insensitive' },
                },
              },
            },
            { uid: { startsWith: searchTerm } },
            { walletAddress: { contains: searchTerm, mode: 'insensitive' } },
            {
              kycSubmissions: {
                some: {
                  status: 'approved',
                  fullName: { contains: searchTerm, mode: 'insensitive' },
                },
              },
            },
          ],
        };
    }

    // Execute search query
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        uid: true,
        walletAddress: true,
        kycStatus: true,
        kycSubmissions: {
          where: {
            status: 'approved',
          },
          select: {
            email: true,
            fullName: true,
          },
          take: 1,
        },
      },
      take: 10, // Limit to 10 results for performance
      orderBy: {
        uid: 'desc', // Most recent users first
      },
    });

    // Transform results to flatten KYC data
    const transformedUsers = users.map((user: any) => ({
      uid: user.uid,
      walletAddress: user.walletAddress,
      email: user.kycSubmissions[0]?.email || '',
      fullName: user.kycSubmissions[0]?.fullName || null,
      kycVerified: user.kycStatus === 'approved',
    }));

    console.log(
      `[Mail Server] Search completed: ${transformedUsers.length} users found for "${searchTerm}" (${searchType})`
    );

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      count: transformedUsers.length,
    });
  } catch (error: any) {
    console.error('[Mail Server] User search failed:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
