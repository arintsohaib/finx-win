export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { PERMISSIONS, hashPassword, ROLES, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
// GET - List all admins (requires MANAGE_ADMINS permission)
export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_ADMINS);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        createdBy: true,
        lastLogin: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse permissions JSON for each admin
    const adminsWithParsedPermissions = admins.map((admin: any) => ({
      ...admin,
      permissions: JSON.parse(admin.permissions),
    }));

    return NextResponse.json({ admins: adminsWithParsedPermissions });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

// POST - Create new admin (requires MANAGE_ADMINS permission)
export async function POST(req: NextRequest) {
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_ADMINS);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { username, email, password, role, permissions } = await req.json();

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.admin.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Only super admin can create other super admins
    if (role === ROLES.SUPER_ADMIN && authResult.admin.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only super admins can create other super admins' },
        { status: 403 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Set default permissions based on role if not provided
    let adminPermissions;
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      adminPermissions = permissions;
    } else {
      // Set default permissions based on role
      if (role === ROLES.EMPLOYEE) {
        adminPermissions = DEFAULT_EMPLOYEE_PERMISSIONS;
      } else {
        adminPermissions = DEFAULT_ADMIN_PERMISSIONS;
      }
    }

    // Create admin
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        role: role || ROLES.ADMIN,
        permissions: JSON.stringify(adminPermissions),
        isActive: true,
        createdBy: authResult.admin.username,
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: JSON.parse(newAdmin.permissions),
        isActive: newAdmin.isActive,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}
