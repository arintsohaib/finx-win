/**
 * URL Utilities for Payment Proof Images
 * Handles both MinIO S3-compatible URLs and legacy local paths
 */

/**
 * Check if URL is a MinIO URL
 * Checks both public URL and API endpoint
 */
function isMinioUrl(url: string): boolean {
  if (!url) return false;
  // Check for API endpoint (s3api.finx.win)
  if (url.includes('s3api.finx.win')) return true;
  // Check for bucket path
  if (url.includes('/finx/')) return true;
  // Also check for legacy net3coin patterns just in case old data exists
  if (url.includes('net3coin') || url.includes('web3coin')) return true;

  return false;
}

/**
 * Check if a URL is an external URL (starts with http/https)
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Build correct MinIO public URL for a given path
 */
export function buildS3Url(path: string | null | undefined): string {
  if (!path) return '';
  if (isExternalUrl(path)) return path;

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If path already contains bucket name, don't add it
  if (cleanPath.startsWith('/finx/')) {
    return `https://s3api.finx.win${cleanPath}`;
  }

  // Otherwise add bucket prefix
  return `https://s3api.finx.win/finx${cleanPath}`;
}

/**
 * Normalizes an image URL from the database
 * Always returns public URL (s3api.finx.win/finx) for MinIO files 
 * or local path (/uploads/...) for local files
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (isExternalUrl(url)) return url;

  // Handle local uploads path
  if (url.startsWith('/uploads/')) return url;

  // Legacy local path handling
  if (url.startsWith('uploads/')) return `/${url}`;

  // Default to S3 URL for anything else (assuming it's a filename or path)
  if (url.startsWith('https://s3api.finx.win/finx/')) {
    return url;
  }

  if (url.startsWith('https://s3api.finx.win/') && !url.includes('/finx/')) {
    const path = url.replace('https://s3api.finx.win/', '');
    return `https://s3api.finx.win/finx/${path}`;
  }

  return buildS3Url(url);
}

/**
 * Build full URL for payment proof image
 */
export function buildImageUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';

  if (isMinioUrl(pathOrUrl)) {
    return normalizeImageUrl(pathOrUrl);
  }

  // If already a full URL (non-MinIO), return as-is for backward compatibility
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  // Build full URL from relative path (legacy local files)
  const appUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || 'https://finx.win';
  return `${appUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Client-side URL builder (for use in React components)
 */
export function buildImageUrlClient(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';

  if (isMinioUrl(pathOrUrl)) {
    return normalizeImageUrl(pathOrUrl);
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  const appUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://finx.win');

  return `${appUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Extract relative path from full URL
 */
export function extractRelativePath(fullUrl: string | null | undefined): string | null {
  if (!fullUrl) return null;

  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    return fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;
  }

  try {
    const url = new URL(fullUrl);
    return url.pathname;
  } catch {
    return fullUrl;
  }
}

/**
 * Check if a URL is valid and accessible
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = validExtensions.some(ext =>
    url.toLowerCase().endsWith(ext)
  );

  const isRelative = !url.startsWith('http://') && !url.startsWith('https://');
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');

  return hasValidExtension && (isRelative || isFullUrl);
}
