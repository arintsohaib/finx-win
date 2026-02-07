export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Filters
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected', 'all'
    const search = searchParams.get('search') || ''; // UID or wallet address
    const currency = searchParams.get('currency'); // BTC, ETH, etc.
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    
    // Build where clause for both deposits and withdrawals
    const buildWhereClause = () => {
      const where: any = {};
      
      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }
      
      // Search by UID, wallet address, KYC name, or KYC email
      if (search) {
        where.OR = [
          {
            user: {
              uid: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            walletAddress: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            user: {
              kycSubmissions: {
                some: {
                  fullName: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              }
            }
          },
          {
            user: {
              kycSubmissions: {
                some: {
                  email: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              }
            }
          }
        ];
      }
      
      // Currency filter
      if (currency) {
        where.currency = currency;
      }
      
      // Date range filter
      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) {
          where.createdAt.gte = new Date(fromDate);
        }
        if (toDate) {
          where.createdAt.lte = new Date(toDate);
        }
      }
      
      // Amount range filter
      if (minAmount || maxAmount) {
        where.usdtAmount = {};
        if (minAmount) {
          where.usdtAmount.gte = parseFloat(minAmount);
        }
        if (maxAmount) {
          where.usdtAmount.lte = parseFloat(maxAmount);
        }
      }
      
      return where;
    };
    
    const where = buildWhereClause();
    
    // Fetch both deposits and withdrawals
    const [deposits, withdrawals, depositCount, withdrawalCount] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          user: {
            select: {
              uid: true,
              walletAddress: true,
              kycStatus: true,
              kycSubmissions: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              uid: true,
              walletAddress: true,
              kycStatus: true,
              kycSubmissions: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deposit.count({ where }),
      prisma.withdrawal.count({ where })
    ]);
    
    // Transform and combine transactions
    const transformedDeposits = deposits.map((deposit: any) => {
      const kycData = deposit.user.kycSubmissions?.[0];
      const hasKyc = deposit.user.kycStatus === 'approved' && kycData;
      
      return {
        ...deposit,
        type: 'deposit' as const,
        uid: deposit.user.uid,
        userDisplay: hasKyc ? kycData.fullName : `UID-${deposit.user.uid}`,
        userEmail: hasKyc ? kycData.email : null,
        kycStatus: deposit.user.kycStatus,
        hasKyc,
        fullWalletAddress: deposit.walletAddress,
        // Return MinIO URL directly (no transformation needed)
        paymentScreenshot: deposit.paymentScreenshot,
      };
    });
    
    const transformedWithdrawals = withdrawals.map((withdrawal: any) => {
      const kycData = withdrawal.user.kycSubmissions?.[0];
      const hasKyc = withdrawal.user.kycStatus === 'approved' && kycData;
      
      return {
        ...withdrawal,
        type: 'withdraw' as const,
        uid: withdrawal.user.uid,
        userDisplay: hasKyc ? kycData.fullName : `UID-${withdrawal.user.uid}`,
        userEmail: hasKyc ? kycData.email : null,
        kycStatus: withdrawal.user.kycStatus,
        hasKyc,
        fullWalletAddress: withdrawal.walletAddress,
      };
    });
    
    // Combine and sort by date (latest first)
    const allTransactions = [...transformedDeposits, ...transformedWithdrawals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Pagination
    const total = depositCount + withdrawalCount;
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);
    
    return NextResponse.json({ 
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet transactions' },
      { status: 500 }
    );
  }
}
