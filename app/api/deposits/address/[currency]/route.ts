export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getQRCodeURL } from '@/lib/qr-generator';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ currency: string }> }
) {
  try {
    const { currency } = await context.params;
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency is required' },
        { status: 400 }
      );
    }

    // Get crypto wallet from database
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { 
        currency: currency.toUpperCase() 
      }
    });

    if (!wallet) {
      return NextResponse.json(
        { error: `${currency} is not supported` },
        { status: 404 }
      );
    }

    if (!wallet.isEnabled) {
      return NextResponse.json(
        { error: `${currency} deposits are currently disabled` },
        { status: 400 }
      );
    }

    // Auto-generate QR code URL
    const qrCodeUrl = getQRCodeURL(wallet.walletAddress);

    return NextResponse.json({
      currency: wallet.currency,
      walletAddress: wallet.walletAddress,
      network: wallet.network || 'Unknown',
      qrCodeUrl: qrCodeUrl,
      minDepositUsdt: Number(wallet.minDepositUsdt),
      isEnabled: wallet.isEnabled
    });

  } catch (error) {
    console.error('Error fetching deposit address:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposit address' },
      { status: 500 }
    );
  }
}
