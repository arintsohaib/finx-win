export const dynamic = 'force-dynamic';
/**
 * QR Code Generation API (Deprecated - use auto-generated QR codes)
 * This endpoint is no longer needed since QR codes are auto-generated via external API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQRCodeURL } from '@/lib/qr-generator';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Generate QR code URL
    const qrCodeUrl = getQRCodeURL(address);
    
    return NextResponse.json({ 
      qrCode: qrCodeUrl,
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
