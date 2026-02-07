export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const whereClause = status === 'all' ? {} : { status };

    const kycSubmissions = await prisma.kYCSubmission.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            walletAddress: true,
            uid: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: kycSubmissions,
    });
  } catch (error) {
    console.error('KYC list fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}
