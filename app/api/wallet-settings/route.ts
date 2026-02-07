export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Get wallet settings
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.walletSettings.findMany();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching wallet settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet settings' },
      { status: 500 }
    );
  }
}
