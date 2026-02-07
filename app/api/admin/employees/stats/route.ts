export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
/**
 * GET /api/admin/employees/stats
 * Get employee performance statistics
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

    // Only SUPER_ADMIN and ADMIN can view employee stats
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
        managedUsers: {
          select: {
            walletAddress: true,
            uid: true,
            kycStatus: true,
            createdAt: true,
            lastLogin: true,
            deposits: {
              where: {
                status: 'approved',
              },
              select: {
                usdtAmount: true,
              },
            },
            withdrawals: {
              where: {
                status: 'approved',
              },
              select: {
                usdtAmount: true,
              },
            },
            trades: {
              where: {
                status: 'finished',
              },
              select: {
                result: true,
              },
            },
          },
        },
      },
    });

    // Calculate stats for each employee
    const employeeStats = employees.map((employee: any) => {
      const totalUsers = employee.managedUsers.length;
      const kycApproved = employee.managedUsers.filter(
        (u: any) => u.kycStatus === 'approved'
      ).length;
      const kycPending = employee.managedUsers.filter(
        (u: any) => u.kycStatus === 'pending'
      ).length;

      const totalDeposits = employee.managedUsers.reduce((sum: any, user: any) => {
        return (
          sum +
          user.deposits.reduce((dSum: any, d: any) => dSum + Number(d.usdtAmount), 0)
        );
      }, 0);

      const totalWithdrawals = employee.managedUsers.reduce((sum: any, user: any) => {
        return (
          sum +
          user.withdrawals.reduce((wSum: any, w: any) => wSum + Number(w.usdtAmount), 0)
        );
      }, 0);

      const totalTrades = employee.managedUsers.reduce((sum: any, user: any) => {
        return sum + user.trades.length;
      }, 0);

      const winningTrades = employee.managedUsers.reduce((sum: any, user: any) => {
        return (
          sum + user.trades.filter((t: any) => t.result === 'win').length
        );
      }, 0);

      return {
        employeeId: employee.id,
        username: employee.username,
        email: employee.email,
        stats: {
          totalUsers,
          kycApproved,
          kycPending,
          totalDeposits,
          totalWithdrawals,
          totalTrades,
          winningTrades,
          winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
        },
      };
    });

    return NextResponse.json({ employeeStats });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee stats' },
      { status: 500 }
    );
  }
}
