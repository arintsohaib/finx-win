export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// GET: Fetch only enabled crypto wallets for users
export async function GET() {
  try {
    const wallets = await prisma.cryptoWallet.findMany({
      where: {
        isEnabled: true,
        walletAddress: {
          not: '', // Only show configured wallets
        },
      },
      orderBy: { currency: 'asc' },
    });
    
    return NextResponse.json({
      success: true,
      wallets: wallets.map((w: any) => ({
        currency: w.currency,
        network: w.network,
        minDepositUsdt: w.minDepositUsdt,
        minWithdrawUsdt: w.minWithdrawUsdt,
      })),
    });
  } catch (error) {
    console.error('Error fetching enabled crypto wallets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crypto wallets' },
      { status: 500 }
    );
  }
}
