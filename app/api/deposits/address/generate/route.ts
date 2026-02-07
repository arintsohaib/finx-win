export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { currency } = body;

    if (!currency) {
      return NextResponse.json({ error: 'Currency is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: payload.walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get admin-configured crypto wallet for this currency
    const cryptoWallet = await prisma.cryptoWallet.findUnique({
      where: { currency: currency.toUpperCase() },
    });

    if (!cryptoWallet || !cryptoWallet.isEnabled || !cryptoWallet.walletAddress) {
      return NextResponse.json({ error: `${currency} deposits are not available` }, { status: 400 });
    }

    // Deactivate any existing active addresses for this currency
    await prisma.depositAddress.updateMany({
      where: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Save to database - use admin-configured wallet address
    const depositAddress = await prisma.depositAddress.create({
      data: {
        walletAddress: payload.walletAddress,
        currency: currency.toUpperCase(),
        address: cryptoWallet.walletAddress,
        qrCode: cryptoWallet.qrCodeUrl || null,
        expiresAt,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: depositAddress,
    });

  } catch (error) {
    console.error('Generate deposit address error:', error);
    return NextResponse.json({ error: 'Failed to generate deposit address' }, { status: 500 });
  }
}
