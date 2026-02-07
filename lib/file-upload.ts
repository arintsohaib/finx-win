/**
 * File Upload Utility
 * Handles file uploads to local storage
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPG, JPEG, and PNG files are allowed.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
    };
  }

  // Additional extension check
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file extension. Only .jpg, .jpeg, and .png are allowed.',
    };
  }

  return { valid: true };
}

/**
 * Upload payment proof image to Local Storage
 * @param file - File object from form data
 * @param userId - User UID or wallet address
 * @returns Object with success status and file URL or error message
 */
export async function uploadPaymentProof(
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${userId}_${timestamp}.${ext}`;

    // Define local path
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'payment_proofs');
    const filePath = join(uploadDir, filename);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Write file to disk
    await writeFile(filePath, fileBuffer);

    // Generate public URL
    const fileUrl = `/uploads/payment_proofs/${filename}`;

    console.log('[Local Upload] Payment proof saved successfully:', {
      path: filePath,
      url: fileUrl,
      size: fileBuffer.length
    });

    return { success: true, url: fileUrl };

  } catch (error) {
    console.error('[Local Upload] Error saving payment proof:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save payment proof locally',
    };
  }
}

/**
 * Upload chat message file to Local Storage
 * @param file - File object from form data
 * @param userId - User UID or wallet address
 * @returns Object with success status and file URL or error message
 */
export async function uploadChatMessageFile(
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `chat_${userId}_${timestamp}.${ext}`;

    // Define local path
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    const filePath = join(uploadDir, filename);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Write file to disk
    await writeFile(filePath, fileBuffer);

    // Generate public URL
    const fileUrl = `/uploads/chat/${filename}`;

    console.log('[Local Upload] Chat file saved successfully:', {
      path: filePath,
      url: fileUrl,
      size: fileBuffer.length
    });

    return { success: true, url: fileUrl };

  } catch (error) {
    console.error('[Local Upload] Error saving chat file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save chat file locally',
    };
  }
}

/**
 * Client-side validation helper
 */
export const ImageValidation = {

  MAX_FILE_SIZE,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,

  getErrorMessage: (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return 'Only JPG, JPEG, and PNG files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024} MB`;
    }
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return 'File must have .jpg, .jpeg, or .png extension';
    }
    return null;
  },
};
