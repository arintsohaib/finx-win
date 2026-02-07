export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, generateAdminToken, initializeDefaultAdmin } from '@/lib/admin-auth';
/**
 * Admin Login API Route
 * 
 * Authenticates admin credentials and sets admin_token cookie
 * This cookie is used by middleware to protect admin routes
 */
export async function POST(req: NextRequest) {
  try {
    // Initialize default admin if needed
    await initializeDefaultAdmin();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const admin = await authenticateAdmin(username, password);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or account is inactive' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateAdminToken(admin);

    // Create response with admin data
    const response = NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      }
    });

    // **CRITICAL: Set admin_token cookie**
    // This cookie is checked by middleware to allow access to admin routes
    response.cookies.set('admin_token', token, {
      httpOnly: true,       // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // Secure in production (HTTPS)
      sameSite: 'lax',      // CSRF protection
      maxAge: 60 * 60 * 24 * 90, // 90 days (3 months, matches JWT expiration)
      path: '/',            // Available across entire site
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
