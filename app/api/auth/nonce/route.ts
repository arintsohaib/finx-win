export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { generateNonce, createAuthMessage } from '@/lib/auth';
export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const nonce = generateNonce();
    const message = createAuthMessage(walletAddress, nonce);

    return NextResponse.json({
      nonce,
      message
    });

  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}
