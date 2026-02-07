export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
export async function GET(req: NextRequest) {
  try {
    const setting = await prisma.adminSettings.findUnique({
      where: { key: 'kyc_required_for_withdrawal' },
    });

    return NextResponse.json({
      kycRequired: setting?.value === 'true',
    });
  } catch (error) {
    console.error('KYC settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch KYC settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { kycRequired } = await req.json();

    if (typeof kycRequired !== 'boolean') {
      return NextResponse.json({ error: 'Invalid kycRequired value' }, { status: 400 });
    }

    // Upsert the setting
    await prisma.adminSettings.upsert({
      where: { key: 'kyc_required_for_withdrawal' },
      update: {
        value: kycRequired.toString(),
        description: 'Whether KYC verification is required for withdrawals',
      },
      create: {
        key: 'kyc_required_for_withdrawal',
        value: kycRequired.toString(),
        description: 'Whether KYC verification is required for withdrawals',
      },
    });

    return NextResponse.json({
      success: true,
      message: `KYC requirement ${kycRequired ? 'enabled' : 'disabled'} successfully`,
      kycRequired,
    });
  } catch (error) {
    console.error('KYC settings update error:', error);
    return NextResponse.json({ error: 'Failed to update KYC settings' }, { status: 500 });
  }
}
