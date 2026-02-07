export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
// ✅ CRITICAL FIX: Use NEXTAUTH_SECRET to match lib/auth.ts verification
// This ensures tokens created during login can be verified by all API endpoints
const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

/**
 * POST /api/auth/wallet-login
 * 
 * Signature-free wallet authentication
 * Accepts wallet address and creates/fetches user session
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Normalize wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // Find or create user with this wallet address
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      select: {
        walletAddress: true,
        uid: true,
        kycStatus: true,
        tradeStatus: true,
        isSuspended: true,
        suspensionReason: true,
        createdAt: true,
        lastLogin: true,
        balances: {
          select: {
            currency: true,
            amount: true,
            realBalance: true,
          },
        },
      },
    });

    // If user doesn't exist, create new user
    if (!user) {
      // Generate unique UID (6-digit format: 100001, 100002, etc.)
      const lastUser = await prisma.user.findFirst({
        orderBy: { uid: 'desc' },
        select: { uid: true },
      });

      // Extract number from UID string and increment
      const lastUidNumber = lastUser ? parseInt(lastUser.uid) : 100000;
      const newUid = String(lastUidNumber + 1);

      user = await prisma.user.create({
        data: {
          uid: newUid,
          walletAddress: normalizedAddress,
          kycStatus: 'not_submitted',
          tradeStatus: 'automatic',
          lastLogin: new Date(),
        },
        select: {
          walletAddress: true,
          uid: true,
          kycStatus: true,
          tradeStatus: true,
          isSuspended: true,
          suspensionReason: true,
          createdAt: true,
          lastLogin: true,
          balances: {
            select: {
              currency: true,
              amount: true,
              realBalance: true,
            },
          },
        },
      });

      console.log(`[Wallet Login] New user created - UID: ${newUid}, Wallet: ${normalizedAddress}`);
    } else {
      // Update last login time for existing user
      await prisma.user.update({
        where: { walletAddress: normalizedAddress },
        data: { lastLogin: new Date() },
      });

      console.log(`[Wallet Login] Existing user logged in - UID: ${user.uid}, Wallet: ${normalizedAddress}`);
    }

    // Calculate total balance from all currencies
    const totalBalance = user.balances.reduce((sum: any, balance: any) => {
      return sum + Number(balance.amount);
    }, 0);

    // Generate JWT token
    const token = jwt.sign(
      {
        walletAddress: user.walletAddress,
        uid: user.uid,
      },
      JWT_SECRET,
      { expiresIn: '180d' } // 180 days expiration (6 months)
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        uid: user.uid,
        kycStatus: user.kycStatus,
        tradeStatus: user.tradeStatus,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        totalBalance,
        balances: user.balances,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      token,
    });

    response.headers.set(
      'Set-Cookie',
      serialize('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 180, // 180 days (6 months)
        path: '/',
      })
    );

    return response;
  } catch (error) {
    console.error('[Wallet Login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with wallet' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/wallet-login
 * 
 * Verify current session
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const cookies = parse(cookieHeader);
    const token = cookies['auth-token'];

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { walletAddress: decoded.walletAddress },
      select: {
        walletAddress: true,
        uid: true,
        kycStatus: true,
        tradeStatus: true,
        isSuspended: true,
        suspensionReason: true,
        createdAt: true,
        lastLogin: true,
        balances: {
          select: {
            currency: true,
            amount: true,
            realBalance: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Calculate total balance
    const totalBalance = user.balances.reduce((sum: any, balance: any) => {
      return sum + Number(balance.amount);
    }, 0);

    return NextResponse.json({
      authenticated: true,
      user: {
        walletAddress: user.walletAddress,
        uid: user.uid,
        kycStatus: user.kycStatus,
        tradeStatus: user.tradeStatus,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        totalBalance,
        balances: user.balances,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('[Wallet Login Verify] Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/wallet-login
 * 
 * Logout (clear session)
 * ✅ CRITICAL FIX: Properly clears cookie and logs action
 */
export async function DELETE(request: NextRequest) {
  try {
    // Try to get user info before logout for logging
    const cookieHeader = request.headers.get('cookie');
    let userInfo = 'unknown';

    if (cookieHeader) {
      const cookies = parse(cookieHeader);
      const token = cookies['auth-token'];

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userInfo = `${decoded.uid || 'unknown'} (${decoded.walletAddress || 'unknown'})`;
        } catch (error) {
          // Token invalid, ignore
        }
      }
    }

    console.log(`[Wallet Logout] User logged out: ${userInfo}`);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth cookie completely
    response.headers.set(
      'Set-Cookie',
      serialize('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    );

    return response;
  } catch (error) {
    console.error('[Wallet Logout] Error during logout:', error);
    // Still return success and clear cookie even if logging fails
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.headers.set(
      'Set-Cookie',
      serialize('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    );

    return response;
  }
}
