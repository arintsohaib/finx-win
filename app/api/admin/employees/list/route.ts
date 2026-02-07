export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
/**
 * GET /api/admin/employees/list
 * Get list of all employees (admins with EMPLOYEE role)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Only SUPER_ADMIN and ADMIN can view employees list
    if (authResult.admin.role === 'EMPLOYEE') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const employees = await prisma.admin.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            managedUsers: true, // Count of users managed by this employee
          },
        },
      },
      orderBy: {
        username: 'asc',
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
