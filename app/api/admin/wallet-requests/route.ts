export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Get all wallet requests (deposits + withdrawals) for admin
export async function GET(request: NextRequest) {
  try {
    // Get deposits
    const deposits = await prisma.deposit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            walletAddress: true,
            uid: true
          }
        }
      }
    });

    // Get withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            walletAddress: true,
            uid: true
          }
        }
      }
    });

    // Combine and sort by date
    const allRequests = [
      ...deposits.map((d: any) => ({
        ...d,
        type: 'deposit',
        uid: d.user.uid,
        amountDisplay: `${d.usdtAmount.toFixed(2)} USDT (${d.cryptoAmount.toFixed(8)} ${d.currency})`
      })),
      ...withdrawals.map((w: any) => ({
        ...w,
        type: 'withdrawal',
        uid: w.user.uid,
        amountDisplay: `${w.usdtAmount.toFixed(2)} USDT (${w.cryptoAmount.toFixed(8)} ${w.currency})`
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Count pending requests
    const pendingCount = allRequests.filter((r: any) => r.status === 'pending').length;

    return NextResponse.json({
      requests: allRequests,
      pendingCount
    });
  } catch (error) {
    console.error('Error fetching wallet requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet requests' },
      { status: 500 }
    );
  }
}
