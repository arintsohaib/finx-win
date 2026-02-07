export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// GET - Fetch admin settings
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const settings = await prisma.adminSettings.findMany({
      orderBy: { key: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });

  } catch (error) {
    console.error('Fetch admin settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST - Update admin setting
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

    // TODO: Add admin role check here

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const setting = await prisma.adminSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });

    return NextResponse.json({
      success: true,
      data: setting,
    });

  } catch (error) {
    console.error('Update admin setting error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
