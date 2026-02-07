export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
/**
 * Get all enabled crypto wallets for deposits
 * Used by converter to show available currencies
 */
export async function GET() {
  try {
    const cryptoWallets = await prisma.cryptoWallet.findMany({
      where: {
        isEnabled: true,
        walletAddress: { not: '' } // Only show fully configured wallets
      },
      orderBy: { currency: 'asc' },
      select: {
        id: true,
        currency: true,
        network: true,
        minDepositUsdt: true
      }
    });

    // Return unique currencies (some may have multiple networks)
    const uniqueCurrencies = [...new Set(cryptoWallets.map((w: any) => w.currency))];

    return NextResponse.json({
      success: true,
      currencies: uniqueCurrencies,
      wallets: cryptoWallets
    });
  } catch (error) {
    console.error('Error fetching enabled crypto wallets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch enabled wallets',
        currencies: [],
        wallets: []
      },
      { status: 500 }
    );
  }
}
