export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { PERMISSIONS, hashPassword, ROLES } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
// GET - Get admin by ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_ADMINS);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await context.params;
    const admin = await prisma.admin.findUnique({
      where: { id },
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
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      admin: {
        ...admin,
        permissions: JSON.parse(admin.permissions),
      },
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin' },
      { status: 500 }
    );
  }
}

// PATCH - Update admin
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_ADMINS);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await context.params;
    const { email, password, role, permissions, isActive } = await req.json();

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Prevent modifying own account
    if (existingAdmin.id === authResult.admin.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own account' },
        { status: 400 }
      );
    }

    // Only super admin can modify other super admins
    if (existingAdmin.role === ROLES.SUPER_ADMIN && authResult.admin.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only super admins can modify other super admins' },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (email !== undefined) {
      // Check if email is already used by another admin
      if (email) {
        const emailExists = await prisma.admin.findFirst({
          where: {
            email,
            NOT: { id },
          },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 400 }
          );
        }
      }
      updateData.email = email || null;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(password);
    }

    if (role !== undefined) {
      // Only super admin can set super admin role
      if (role === ROLES.SUPER_ADMIN && authResult.admin.role !== ROLES.SUPER_ADMIN) {
        return NextResponse.json(
          { error: 'Only super admins can grant super admin role' },
          { status: 403 }
        );
      }
      updateData.role = role;
    }

    if (permissions !== undefined && Array.isArray(permissions)) {
      updateData.permissions = JSON.stringify(permissions);
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        permissions: JSON.parse(updatedAdmin.permissions),
        isActive: updatedAdmin.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { error: 'Failed to update admin' },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_ADMINS);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await context.params;
    
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Prevent deleting own account
    if (existingAdmin.id === authResult.admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Only super admin can delete other super admins
    if (existingAdmin.role === ROLES.SUPER_ADMIN && authResult.admin.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only super admins can delete other super admins' },
        { status: 403 }
      );
    }

    // Delete admin
    await prisma.admin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin' },
      { status: 500 }
    );
  }
}
