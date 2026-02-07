import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Generate proper file URL for serving uploaded files
 * Converts database file path to API endpoint URL
 * @param filePath - File path from database (e.g., 'uploads/deposits/123-proof.jpg')
 * @returns API URL (e.g., '/api/files/uploads/deposits/123-proof.jpg') or null
 */
export function getFileUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  
  // If already starts with /api/files/, return as-is
  if (filePath.startsWith('/api/files/')) {
    return filePath;
  }
  
  // Convert database path to API URL
  return `/api/files/${filePath}`;
}