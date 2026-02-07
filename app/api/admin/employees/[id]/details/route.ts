export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
/**
 * GET /api/admin/employees/[id]/details
 * Get detailed information about a specific employee
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Only SUPER_ADMIN and ADMIN can view employee details
    if (authResult.admin.role === 'EMPLOYEE') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const employee = await prisma.admin.findUnique({
      where: {
        id,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        lastLogin: true,
        isActive: true,
        permissions: true,
        managedUsers: {
          select: {
            walletAddress: true,
            uid: true,
            kycStatus: true,
            createdAt: true,
            lastLogin: true,
            balances: {
              select: {
                currency: true,
                amount: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee details' },
      { status: 500 }
    );
  }
}
