export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
/**
 * POST /api/admin/users/assign-employee
 * Assign or unassign an employee to manage a user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Only SUPER_ADMIN and ADMIN can assign employees
    if (authResult.admin.role === 'EMPLOYEE') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { walletAddress, employeeId } = body; // employeeId can be null to unassign

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        walletAddress: true,
        uid: true,
        assignedEmployeeId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If employeeId is provided, verify it's a valid employee
    if (employeeId) {
      const employee = await prisma.admin.findUnique({
        where: {
          id: employeeId,
          role: 'EMPLOYEE',
          isActive: true,
        },
        select: {
          id: true,
          username: true,
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: 'Invalid employee ID or employee not active' },
          { status: 400 }
        );
      }

      // Assign employee to user
      const updatedUser = await prisma.user.update({
        where: { walletAddress },
        data: {
          assignedEmployeeId: employeeId,
        },
        select: {
          walletAddress: true,
          uid: true,
          assignedEmployee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      // Log the assignment
      await logActivity({
        walletAddress,
        uid: user.uid,
        activityType: 'USER_ASSIGNED_TO_EMPLOYEE',
        activityCategory: 'ADMIN',
        status: 'success',
        metadata: {
          employeeId,
          employeeUsername: employee.username,
          assignedBy: authResult.admin.username,
        },
      });

      return NextResponse.json({
        message: `User ${user.uid} assigned to employee ${employee.username}`,
        user: updatedUser,
      });
    } else {
      // Unassign employee (set to null)
      const updatedUser = await prisma.user.update({
        where: { walletAddress },
        data: {
          assignedEmployeeId: null,
        },
        select: {
          walletAddress: true,
          uid: true,
          assignedEmployee: true,
        },
      });

      // Log the unassignment
      await logActivity({
        walletAddress,
        uid: user.uid,
        activityType: 'USER_UNASSIGNED_FROM_EMPLOYEE',
        activityCategory: 'ADMIN',
        status: 'success',
        metadata: {
          unassignedBy: authResult.admin.username,
          previousEmployeeId: user.assignedEmployeeId,
        },
      });

      return NextResponse.json({
        message: `User ${user.uid} unassigned from employee`,
        user: updatedUser,
      });
    }
  } catch (error) {
    console.error('Error assigning employee:', error);
    return NextResponse.json(
      { error: 'Failed to assign employee' },
      { status: 500 }
    );
  }
}
