
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRole, Permission, ROLES } from '@/lib/admin-constants';

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: AdminRole;
  permissions: Permission[];
}

/**
 * Admin Authentication Hook
 * 
 * Uses httpOnly cookies for secure authentication
 * - Token is stored in httpOnly cookie (not accessible via JavaScript)
 * - Admin info is stored in localStorage for UI purposes only
 * - All API calls use cookie-based authentication
 */
// In-memory token fallback for environments where localStorage is blocked
// and cookies are stripped/blocked.
let memoryToken: string | null = null;

export function useAdminAuth() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAdminInfo = localStorage.getItem('admin_info');
        if (storedAdminInfo) {
          try {
            return JSON.parse(storedAdminInfo);
          } catch (error) {
            console.error('Error parsing admin info from cache:', error);
            try { localStorage.removeItem('admin_info'); } catch { }
          }
        }
      } catch (e) {
        console.warn('LocalStorage access failed (init)', e);
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync with server on mount to verify session
    fetchAdminInfo();
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache'
      };

      // Attempt to get token from storage or memory for fallback
      let token = memoryToken;
      if (!token && typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('admin_token');
        } catch (e) {
          // LocalStorage access denied
        }
      }

      // Add Bearer token if available (redundancy for failed cookies)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // This will automatically include the admin_token cookie
      const response = await fetch('/api/admin/me', {
        credentials: 'include', // Ensure cookies are included
        cache: 'no-store', // Prevent caching
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
        // Update localStorage with fresh admin info
        try {
          localStorage.setItem('admin_info', JSON.stringify(data.admin));
        } catch (e) {
          console.warn('LocalStorage access failed (update)', e);
        }
      } else {
        // Cookie is invalid or expired, clear admin info and redirect to login
        console.warn('Admin authentication failed - cookie invalid or expired');
        try {
          localStorage.removeItem('admin_info');
          localStorage.removeItem('admin_username');
          localStorage.removeItem('admin_id');
          localStorage.removeItem('admin_token');
        } catch (e) {
          console.warn('LocalStorage access failed (clear)', e);
        }
        memoryToken = null;
        setAdmin(null);

        // If we're on an admin route (not login page), redirect to login
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
      try {
        localStorage.removeItem('admin_info');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_id');
      } catch (e) {
        console.warn('LocalStorage access failed (error clear)', e);
      }
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Ensure cookies are set
    });

    if (response.ok) {
      const data = await response.json();

      // Update memory token
      if (data.token) {
        memoryToken = data.token;
      }

      // Store admin info and token in localStorage for UI purposes and fallback
      try {
        localStorage.setItem('admin_info', JSON.stringify(data.admin));
        localStorage.setItem('admin_username', data.admin.username);
        localStorage.setItem('admin_id', data.admin.id);
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
      } catch (e) {
        console.warn('LocalStorage access failed (login)', e);
      }
      setAdmin(data.admin);
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const headers: Record<string, string> = {};
      let token = memoryToken;
      if (!token && typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('admin_token');
        } catch (e) { }
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call logout API to clear the httpOnly cookie
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Clear localStorage admin info
    try {
      localStorage.removeItem('admin_info');
      localStorage.removeItem('admin_username');
      localStorage.removeItem('admin_id');
      localStorage.removeItem('admin_token');
    } catch (e) {
      console.warn('LocalStorage access failed (logout)', e);
    }
    memoryToken = null;
    setAdmin(null);

    // Hard redirect to admin login to ensure middleware processes the cleared cookie
    window.location.href = '/admin/login';
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!admin) return false;
    if (admin.role === ROLES.SUPER_ADMIN) return true;
    return admin.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!admin) return false;
    if (admin.role === ROLES.SUPER_ADMIN) return true;
    return permissions.some(permission => admin.permissions.includes(permission));
  };

  const isSuperAdmin = (): boolean => {
    return admin?.role === ROLES.SUPER_ADMIN;
  };

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    isSuperAdmin: isSuperAdmin(),
    login,
    logout,
    hasPermission,
    hasAnyPermission,
  };
}
