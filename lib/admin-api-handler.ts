/**
 * Admin API Handler Utility
 * 
 * Provides centralized error handling for admin API calls
 * Automatically handles authentication failures by redirecting to login
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch wrapper for admin API calls with automatic auth error handling
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response data or null if failed
 */
export async function adminApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Always include cookies
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      
      // Handle authentication errors - redirect to login
      if (response.status === 401 || response.status === 403) {
        console.warn('Admin authentication failed - redirecting to login');
        
        // Clear stale admin data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_info');
          localStorage.removeItem('admin_username');
          localStorage.removeItem('admin_id');
          
          // Redirect to login if not already there
          if (window.location.pathname !== '/admin/login') {
            window.location.href = '/admin/login';
          }
        }
        
        return {
          success: false,
          error: errorData.error || 'Authentication required. Please log in again.',
        };
      }

      return {
        success: false,
        error: errorData.error || 'Request failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Admin API fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

/**
 * Helper to check if error is an authentication error
 */
export function isAuthError(error: string): boolean {
  const authErrors = [
    'authentication required',
    'not authenticated',
    'invalid token',
    'expired token',
    'unauthorized',
    'forbidden',
  ];
  
  return authErrors.some(authError => 
    error.toLowerCase().includes(authError)
  );
}
