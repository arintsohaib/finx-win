export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminAuth, hasPermission, PERMISSIONS, AdminJWTPayload } from '@/lib/admin-auth';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminResult = await verifyAdminAuth(request);
    if (!adminResult || 'error' in adminResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = adminResult as AdminJWTPayload;

    // Check if admin has permission to view activities
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search') || '';
    const activityType = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build the where clause for filtering by employee through User relation
    const whereClause: any = {};
    if (employeeId && employeeId !== 'all') {
      whereClause.user = {
        assignedEmployeeId: employeeId,
      };
    }

    // Build search clause for UID, wallet, name, and email
    const searchClause: any = {};
    if (search) {
      searchClause.user = {
        OR: [
          { uid: { contains: search } },
          { walletAddress: { contains: search, mode: 'insensitive' as const } },
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
        ],
      };

      // Merge with employee filter if exists
      if (whereClause.user) {
        whereClause.user = {
          ...whereClause.user,
          ...searchClause.user,
        };
      } else {
        whereClause.user = searchClause.user;
      }
    }

    // Conditionally fetch activities based on type filter
    const shouldFetchDeposits = activityType === 'all' || activityType === 'deposit';
    const shouldFetchWithdrawals = activityType === 'all' || activityType === 'withdrawal';
    const shouldFetchTrades = activityType === 'all' || activityType === 'trade';
    const shouldFetchConversions = activityType === 'all' || activityType === 'conversion';

    // Fetch deposits with user and employee info
    // Note: We fetch more records than needed per page to ensure proper sorting across all tables
    const deposits = shouldFetchDeposits ? await prisma.deposit.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit * 10, // Fetch 10x to ensure we have enough after interleaving with other activities
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            assignedEmployeeId: true,
            assignedEmployee: {
              select: {
                id: true,
                username: true,
              },
            },
            kycSubmissions: {
              select: {
                fullName: true,
                email: true,
              },
              where: {
                status: 'approved',
              },
              take: 1,
            },
          },
        },
      },
    }) : [];

    // Fetch withdrawals with user and employee info
    const withdrawals = shouldFetchWithdrawals ? await prisma.withdrawal.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit * 10, // Fetch 10x to ensure we have enough after interleaving
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            assignedEmployeeId: true,
            assignedEmployee: {
              select: {
                id: true,
                username: true,
              },
            },
            kycSubmissions: {
              select: {
                fullName: true,
                email: true,
              },
              where: {
                status: 'approved',
              },
              take: 1,
            },
          },
        },
      },
    }) : [];

    // Fetch trades with user and employee info
    const trades = shouldFetchTrades ? await prisma.trade.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit * 10, // Fetch 10x to ensure we have enough after interleaving
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            assignedEmployeeId: true,
            assignedEmployee: {
              select: {
                id: true,
                username: true,
              },
            },
            kycSubmissions: {
              select: {
                fullName: true,
                email: true,
              },
              where: {
                status: 'approved',
              },
              take: 1,
            },
          },
        },
      },
    }) : [];

    // Fetch conversions with user and employee info
    const conversions = shouldFetchConversions ? await prisma.conversion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit * 10, // Fetch 10x to ensure we have enough after interleaving
      include: {
        user: {
          select: {
            uid: true,
            walletAddress: true,
            assignedEmployeeId: true,
            assignedEmployee: {
              select: {
                id: true,
                username: true,
              },
            },
            kycSubmissions: {
              select: {
                fullName: true,
                email: true,
              },
              where: {
                status: 'approved',
              },
              take: 1,
            },
          },
        },
      },
    }) : [];

    // Fetch all employees for the filter dropdown
    const employees = await prisma.admin.findMany({
      where: {
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        username: true,
        _count: {
          select: {
            managedUsers: true,
          },
        },
      },
      orderBy: {
        username: 'asc',
      },
    });

    // Transform and combine all activities into a unified format
    const activities: any[] = [];

    // Add deposits
    deposits.forEach((deposit: any) => {
      const kycName = deposit.user.kycSubmissions?.[0]?.fullName;
      activities.push({
        id: `deposit-${deposit.id}`,
        type: 'DEPOSIT',
        timestamp: deposit.createdAt,
        userId: deposit.user.uid,
        userName: kycName || `UID ${deposit.user.uid}`,
        walletAddress: deposit.user.walletAddress,
        employeeName: deposit.user.assignedEmployee?.username || 'Unassigned',
        currency: deposit.currency,
        amount: parseFloat(deposit.cryptoAmount.toString()),
        usdtAmount: parseFloat(deposit.usdtAmount.toString()),
        status: deposit.status,
        referenceId: deposit.id,
        metadata: {
          txHash: deposit.txHash,
          depositAddress: deposit.depositAddress,
        },
      });
    });

    // Add withdrawals
    withdrawals.forEach((withdrawal: any) => {
      const kycName = withdrawal.user.kycSubmissions?.[0]?.fullName;
      activities.push({
        id: `withdrawal-${withdrawal.id}`,
        type: 'WITHDRAWAL',
        timestamp: withdrawal.createdAt,
        userId: withdrawal.user.uid,
        userName: kycName || `UID ${withdrawal.user.uid}`,
        walletAddress: withdrawal.user.walletAddress,
        employeeName: withdrawal.user.assignedEmployee?.username || 'Unassigned',
        currency: withdrawal.currency,
        amount: parseFloat(withdrawal.cryptoAmount.toString()),
        usdtAmount: parseFloat(withdrawal.usdtAmount.toString()),
        fee: parseFloat(withdrawal.fee.toString()),
        status: withdrawal.status,
        referenceId: withdrawal.id,
        metadata: {
          destinationAddress: withdrawal.destinationAddress,
          txHash: withdrawal.txHash,
        },
      });
    });

    // Add trades
    trades.forEach((trade: any) => {
      const kycName = trade.user.kycSubmissions?.[0]?.fullName;
      activities.push({
        id: trade.id, // Use actual trade ID for manual control
        type: 'TRADE',
        timestamp: trade.createdAt,
        userId: trade.user.uid,
        userName: kycName || `UID ${trade.user.uid}`,
        walletAddress: trade.user.walletAddress,
        employeeName: trade.user.assignedEmployee?.username || 'Unassigned',
        tradeType: trade.side.toUpperCase(),
        asset: trade.asset,
        entryPrice: parseFloat(trade.entryPrice.toString()),
        amount: parseFloat(trade.amountUsd.toString()),
        openedAt: trade.createdAt,
        completedAt: trade.closedAt,
        expiresAt: trade.expiresAt,
        result: trade.result,
        profitLoss: trade.pnl ? parseFloat(trade.pnl.toString()) : null,
        status: trade.status,
        referenceId: trade.id,
        manualOutcomePreset: trade.manualOutcomePreset,
        manualPresetBy: trade.manualPresetBy,
        manualPresetAt: trade.manualPresetAt,
        duration: trade.duration,
      });
    });

    // Add conversions
    conversions.forEach((conversion: any) => {
      const kycName = conversion.user.kycSubmissions?.[0]?.fullName;
      activities.push({
        id: `conversion-${conversion.id}`,
        type: 'CONVERSION',
        timestamp: conversion.createdAt,
        userId: conversion.user.uid,
        userName: kycName || `UID ${conversion.user.uid}`,
        walletAddress: conversion.user.walletAddress,
        employeeName: conversion.user.assignedEmployee?.username || 'Unassigned',
        fromCurrency: conversion.fromCurrency,
        toCurrency: conversion.toCurrency,
        fromAmount: parseFloat(conversion.fromAmount.toString()),
        toAmount: parseFloat(conversion.toAmount.toString()),
        rate: parseFloat(conversion.rate.toString()),
        status: conversion.status,
        referenceId: conversion.id,
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Get total count before pagination
    const totalCount = activities.length;

    // Apply pagination to the sorted activities
    const paginatedActivities = activities.slice(skip, skip + limit);

    return NextResponse.json({
      activities: paginatedActivities,
      employees,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Summary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
