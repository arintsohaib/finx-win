export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
export async function GET() {
  try {
    const wallets = await prisma.cryptoWallet.findMany({
      orderBy: { currency: 'asc' },
    });
    
    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Error fetching crypto wallets:', error);
    return NextResponse.json({ error: 'Failed to fetch crypto wallets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { currency, walletAddress, network, minDepositUsdt, minWithdrawUsdt, isEnabled } = await request.json();

    if (!currency) {
      return NextResponse.json(
        { error: 'Currency is required' },
        { status: 400 }
      );
    }

    // Wallet address is required only if enabling the crypto
    if (isEnabled && !walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required to enable this cryptocurrency' },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    const existing = await prisma.cryptoWallet.findUnique({
      where: { currency: currency.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json(
        { error: `Wallet for ${currency} already exists` },
        { status: 400 }
      );
    }

    const wallet = await prisma.cryptoWallet.create({
      data: {
        currency: currency.toUpperCase(),
        walletAddress: walletAddress || '',
        network: network || null,
        qrCodeUrl: null, // QR codes are auto-generated
        minDepositUsdt: minDepositUsdt || 10,
        minWithdrawUsdt: minWithdrawUsdt || 10,
        isEnabled: isEnabled !== undefined ? isEnabled : false, // Default to disabled if no wallet address
      },
    });

    console.log('[Admin Crypto Wallets] Wallet created successfully:', wallet.id);
    return NextResponse.json(wallet);
  } catch (error) {
    console.error('[Admin Crypto Wallets] Error creating crypto wallet:', error);
    return NextResponse.json({ error: 'Failed to create crypto wallet' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, walletAddress, network, minDepositUsdt, minWithdrawUsdt, isEnabled } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = await prisma.cryptoWallet.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = await prisma.cryptoWallet.update({
      where: { id },
      data: {
        walletAddress: walletAddress || existing.walletAddress,
        network: network !== undefined ? network : existing.network,
        minDepositUsdt: minDepositUsdt !== undefined ? minDepositUsdt : existing.minDepositUsdt,
        minWithdrawUsdt: minWithdrawUsdt !== undefined ? minWithdrawUsdt : existing.minWithdrawUsdt,
        isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
      },
    });

    console.log('[Admin Crypto Wallets] Wallet updated successfully:', wallet.id);
    return NextResponse.json(wallet);
  } catch (error) {
    console.error('[Admin Crypto Wallets] Error updating crypto wallet:', error);
    return NextResponse.json({ error: 'Failed to update crypto wallet' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const wallet = await prisma.cryptoWallet.findUnique({ 
      where: { id } 
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    await prisma.cryptoWallet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting crypto wallet:', error);
    return NextResponse.json({ error: 'Failed to delete crypto wallet' }, { status: 500 });
  }
}
