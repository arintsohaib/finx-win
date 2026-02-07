export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Get withdrawal details
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) {
        return NextResponse.json(
            { error: adminCheck.error },
            { status: adminCheck.status }
        );
    }

    try {
        const { id } = await context.params;
        const withdrawal = await prisma.withdrawal.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        uid: true,
                        walletAddress: true,
                        kycStatus: true,
                        kycSubmissions: {
                            select: {
                                fullName: true,
                                email: true,
                                status: true,
                            },
                            orderBy: {
                                submittedAt: 'desc',
                            },
                            take: 1,
                        },
                    }
                }
            }
        });

        if (!withdrawal) {
            return NextResponse.json(
                { error: 'Withdrawal not found' },
                { status: 404 }
            );
        }

        const kycData = withdrawal.user.kycSubmissions?.[0];
        const hasKyc = withdrawal.user.kycStatus === 'approved' && kycData;

        return NextResponse.json({
            withdrawal: {
                ...withdrawal,
                cryptoAmount: Number(withdrawal.cryptoAmount),
                usdtAmount: Number(withdrawal.usdtAmount),
                fee: Number(withdrawal.fee),
                createdAt: withdrawal.createdAt.toISOString(),
                processedAt: withdrawal.processedAt?.toISOString() || null,
                uid: withdrawal.user.uid,
                userDisplay: hasKyc ? kycData.fullName : `UID-${withdrawal.user.uid}`,
                userEmail: hasKyc ? kycData.email : null,
                hasKyc
            }
        });
    } catch (error) {
        console.error('Error fetching withdrawal:', error);
        return NextResponse.json(
            { error: 'Failed to fetch withdrawal' },
            { status: 500 }
        );
    }
}
