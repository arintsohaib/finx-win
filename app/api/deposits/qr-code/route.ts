export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getQRCodeURL } from '@/lib/qr-generator';
/**
 * Generate QR code for any wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Generate QR code URL
    const qrCodeUrl = getQRCodeURL(address);

    return NextResponse.json({
      qrCodeUrl,
      address
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
