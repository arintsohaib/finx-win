
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, hasPermission, hasAnyPermission, Permission } from './admin-auth';

/**
 * Extract admin token from request
 * 
 * Priority:
 * 1. httpOnly cookie (admin_token) - Preferred for security
 * 2. Authorization header (Bearer token) - For API clients/testing
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  // Debug mode: Log all cookies
  const allCookies = req.cookies.getAll();
  console.log('[Middleware] Cookies received:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));

  // Try cookie first (preferred method for browser-based admin panel)
  const cookieToken = req.cookies.get('admin_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to Authorization header (for API clients/testing)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Middleware to verify admin is authenticated
export async function requireAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const admin = await getAdminFromToken(token);

  if (!admin) {
    return {
      error: 'Unauthorized',
      status: 401,
    };
  }

  return { admin };
}

// Middleware to verify admin has specific permission
export async function requirePermission(req: NextRequest, permission: Permission) {
  const result = await requireAdmin(req);

  if ('error' in result) {
    return result;
  }

  if (!hasPermission(result.admin, permission)) {
    return {
      error: 'Forbidden: Insufficient permissions',
      status: 403,
    };
  }

  return result;
}

// Middleware to verify admin has any of the specified permissions
export async function requireAnyPermission(req: NextRequest, permissions: Permission[]) {
  const result = await requireAdmin(req);

  if ('error' in result) {
    return result;
  }

  if (!hasAnyPermission(result.admin, permissions)) {
    return {
      error: 'Forbidden: Insufficient permissions',
      status: 403,
    };
  }

  return result;
}
