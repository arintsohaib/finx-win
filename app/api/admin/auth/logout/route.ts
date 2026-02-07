export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
/**
 * Admin Logout API Route
 * 
 * Clears the admin_token cookie to log out the admin
 * Note: Does not affect wallet_token (user authentication remains independent)
 */
export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the admin_token cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: false,        // Match login setting for consistency
      sameSite: 'lax',
      maxAge: 0,            // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
