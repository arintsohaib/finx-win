
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Shield, User, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSIONS, PERMISSION_LABELS, ROLES, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS, Permission } from '@/lib/admin-constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Admin {
  id: string;
  username: string;
  email?: string;
  role: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  lastLogin?: string;
}

export function AdminManagementTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ROLES.ADMIN as string,
    permissions: DEFAULT_ADMIN_PERMISSIONS as Permission[],
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/admins', {
        credentials: 'include',
        headers: {
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins);
      } else {
        toast.error('Failed to fetch admins');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to fetch admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }

    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Admin created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to create admin');
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      // Token automatically sent via httpOnly cookie
      const updateData: any = {
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions,
      };

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Admin updated successfully');
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
        resetForm();
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin');
    }
  };

  const handleDeleteAdmin = (adminId: string) => {
    setAdminToDelete(adminId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;

    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/admins/${adminToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
        },
      });

      if (response.ok) {
        toast.success('Admin deleted successfully');
        fetchAdmins();
        setDeleteConfirmOpen(false);
        setAdminToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin');
    }
  };

  const handleToggleActive = async (admin: Admin) => {
    try {
      // Token automatically sent via httpOnly cookie
      const response = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });

      if (response.ok) {
        toast.success(`Admin ${!admin.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update admin status');
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email || '',
      password: '',
      role: admin.role,
      permissions: admin.permissions,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: ROLES.ADMIN,
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    });
  };

  const togglePermission = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p: any) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>
                Manage admin accounts and their permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Create a new admin account with custom permissions
                  </DialogDescription>
                </DialogHeader>
                <AdminForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCreateAdmin}
                  isEdit={false}
                  togglePermission={togglePermission}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {admin.role === ROLES.SUPER_ADMIN ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      {admin.username}
                    </div>
                  </TableCell>
                  <TableCell>{admin.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      admin.role === ROLES.SUPER_ADMIN ? 'default' :
                        admin.role === ROLES.ADMIN ? 'secondary' :
                          'outline'
                    }>
                      {admin.role === ROLES.SUPER_ADMIN ? 'Super Admin' :
                        admin.role === ROLES.ADMIN ? 'Admin' :
                          admin.role === ROLES.EMPLOYEE ? 'Employee' :
                            'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                      {admin.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{admin.createdBy || '-'}</TableCell>
                  <TableCell>
                    {admin.lastLogin
                      ? new Date(admin.lastLogin).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="gradientGhost"
                        onClick={() => handleToggleActive(admin)}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="gradientGhost"
                        onClick={() => openEditDialog(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="gradientGhost"
                        onClick={() => handleDeleteAdmin(admin.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update admin account details and permissions
            </DialogDescription>
          </DialogHeader>
          <AdminForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateAdmin}
            isEdit={true}
            togglePermission={togglePermission}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this admin? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAdmin} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Admin form component
function AdminForm({
  formData,
  setFormData,
  onSubmit,
  isEdit,
  togglePermission,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isEdit: boolean;
  togglePermission: (permission: Permission) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          disabled={isEdit}
          placeholder="Enter username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password {isEdit ? '(leave blank to keep current)' : '*'}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder={isEdit ? 'Enter new password' : 'Enter password'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => {
            // Automatically set default permissions based on role
            let defaultPerms = DEFAULT_ADMIN_PERMISSIONS;
            if (value === ROLES.SUPER_ADMIN) {
              defaultPerms = [];
            } else if (value === ROLES.EMPLOYEE) {
              defaultPerms = DEFAULT_EMPLOYEE_PERMISSIONS;
            } else if (value === ROLES.ADMIN) {
              defaultPerms = DEFAULT_ADMIN_PERMISSIONS;
            }
            setFormData({ ...formData, role: value, permissions: defaultPerms });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
            <SelectItem value={ROLES.SUPER_ADMIN}>Super Admin</SelectItem>
            <SelectItem value={ROLES.EMPLOYEE}>Employee</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {formData.role === ROLES.SUPER_ADMIN && 'Super Admins have all permissions by default'}
          {formData.role === ROLES.ADMIN && 'Admins have most permissions except wallet settings and admin management'}
          {formData.role === ROLES.EMPLOYEE && 'Employees can only manage assigned users (deposits, withdrawals, KYC, chat)'}
        </p>
      </div>

      {formData.role !== ROLES.SUPER_ADMIN && (
        <div className="space-y-2">
          <Label>Permissions</Label>
          <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
            {Object.values(PERMISSIONS).map((permission) => {
              const info = PERMISSION_LABELS[permission];
              return (
                <div key={permission} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission}
                    checked={formData.permissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={permission}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {info.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {info.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => { }}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Update Admin' : 'Create Admin'}
        </Button>
      </div>
    </div>
  );
}
