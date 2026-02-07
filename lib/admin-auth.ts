
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

// SECURITY: Use separate admin JWT secret for enhanced security
// Admins should have a different signing key than regular users
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'build_safe_dummy_secret';

// Security check: Only throw at RUNTIME, not during build evaluation
if (!process.env.ADMIN_JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error(
      'CRITICAL SECURITY ERROR: ADMIN_JWT_SECRET (or NEXTAUTH_SECRET) environment variable is not set. ' +
      'Admin authentication cannot function without a secure JWT secret.'
    );
  }
}

// Permission constants
import {
  PERMISSIONS,
  Permission,
  ROLES,
  AdminRole,
  SUPER_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_LABELS
} from './admin-constants';

export {
  PERMISSIONS,
  type Permission,
  ROLES,
  type AdminRole,
  SUPER_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_LABELS
};

export interface AdminJWTPayload {
  id: string;
  username: string;
  role: AdminRole;
  permissions: Permission[];
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token for admin
export function generateAdminToken(admin: {
  id: string;
  username: string;
  role: AdminRole;
  permissions: Permission[];
}): string {
  const payload: Omit<AdminJWTPayload, 'exp'> = {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '90d', // 90 days (3 months)
  });
}

// Verify admin token
export function verifyAdminToken(token: string): AdminJWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
    return payload;
  } catch (error) {
    console.error('JWT Verification failed:', error);
    return null;
  }
}

// Check if admin has specific permission
export function hasPermission(admin: AdminJWTPayload, permission: Permission): boolean {
  // Super admin has all permissions
  if (admin.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  return admin.permissions.includes(permission);
}

// Check if admin has any of the specified permissions
export function hasAnyPermission(admin: AdminJWTPayload, permissions: Permission[]): boolean {
  if (admin.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  return permissions.some(permission => admin.permissions.includes(permission));
}

// Initialize default super admin if no admins exist
export async function initializeDefaultAdmin() {
  try {
    const adminCount = await prisma.admin.count();

    if (adminCount === 0) {
      const passwordHash = await hashPassword('admin123');

      await prisma.admin.create({
        data: {
          username: 'admin',
          email: 'admin@finx.win',
          passwordHash,
          role: ROLES.SUPER_ADMIN,
          permissions: JSON.stringify(SUPER_ADMIN_PERMISSIONS),
          isActive: true,
        },
      });

      console.log('Default super admin created: admin / admin123');
    }
  } catch (error) {
    console.error('Error initializing default admin:', error);
  }
}

// Authenticate admin
export async function authenticateAdmin(username: string, password: string) {
  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      return null;
    }

    const isValid = await verifyPassword(password, admin.passwordHash);

    if (!isValid) {
      return null;
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Parse permissions
    const permissions = JSON.parse(admin.permissions) as Permission[];

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role as AdminRole,
      permissions,
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return null;
  }
}

// Get admin from token (for API routes)
export async function getAdminFromToken(token: string | null) {
  if (!token) {
    return null;
  }

  const payload = verifyAdminToken(token);

  if (!payload) {
    return null;
  }

  // Verify admin still exists and is active
  const admin = await prisma.admin.findUnique({
    where: { id: payload.id },
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  return payload;
}



/**
 * Extract admin token from request
 * Checks both cookies (preferred) and Authorization header
 */
export function getAdminTokenFromRequest(request: Request): string | null {
  // For NextRequest (has cookies property)
  if ('cookies' in request && typeof (request as any).cookies?.get === 'function') {
    const allCookies = (request as any).cookies.getAll();
    console.log('[getAdminTokenFromRequest] All Cookies:', JSON.stringify(allCookies.map((c: any) => c.name)));
    const cookieToken = (request as any).cookies.get('admin_token')?.value;
    if (cookieToken) {
      return cookieToken;
    }
  }

  // Fallback to Authorization header (for API clients/testing)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware helper to require admin authentication
 * Returns admin payload or error response
 * Checks cookies first (browser), then Authorization header (API clients)
 */
export async function requireAdmin(request: Request): Promise<AdminJWTPayload | { error: string; status: number }> {
  const token = getAdminTokenFromRequest(request);

  if (!token) {
    return { error: 'Not authenticated', status: 401 };
  }

  const admin = verifyAdminToken(token);

  if (!admin) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return admin;
}

/**
 * Verify admin authentication from request
 * Alias for requireAdmin
 */
export async function verifyAdminAuth(request: Request): Promise<AdminJWTPayload | { error: string; status: number }> {
  return requireAdmin(request);
}
