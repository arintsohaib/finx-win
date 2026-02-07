export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    // Get service health metrics
    const [
      totalUsers,
      activeTrades,
      pendingDeposits,
      pendingWithdrawals,
      recentDeposits,
      recentTrades,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.trade.count({ where: { status: 'active' } }),
      prisma.deposit.count({ where: { status: 'pending' } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.deposit.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
          },
        },
      }),
      prisma.trade.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
          },
        },
      }),
    ]);

    // Determine health status
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: dbResponseTime,
        status: dbResponseTime < 2000 ? 'healthy' : 'slow',
      },
      services: {
        deposits: {
          pending: pendingDeposits,
          recent: recentDeposits,
          status: recentDeposits > 0 || pendingDeposits === 0 ? 'healthy' : 'warning',
        },
        trades: {
          active: activeTrades,
          recent: recentTrades,
          status: recentTrades > 0 || activeTrades === 0 ? 'healthy' : 'warning',
        },
        withdrawals: {
          pending: pendingWithdrawals,
          status: 'healthy',
        },
      },
      metrics: {
        totalUsers,
        activeTrades,
        pendingDeposits,
        pendingWithdrawals,
      },
      alerts: [] as string[],
    };

    // Check for alerts
    if (dbResponseTime >= 2000) {
      healthStatus.alerts.push('Database response time is slow (>2s)');
      healthStatus.status = 'warning';
    }

    if (pendingDeposits > 50) {
      healthStatus.alerts.push(`High number of pending deposits: ${pendingDeposits}`);
      healthStatus.status = 'warning';
    }

    if (pendingWithdrawals > 20) {
      healthStatus.alerts.push(`High number of pending withdrawals: ${pendingWithdrawals}`);
      healthStatus.status = 'warning';
    }

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        alerts: ['Database connection failed'],
      },
      { status: 500 }
    );
  }
}
