
/**
 * Image Processing Utility
 * Handles validation, resizing, compression, and storage of payment proof images
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_WIDTH = 600; // px - Maximum width for uploaded images
const TARGET_FILE_SIZE = 500 * 1024; // 500 KB - Target compressed size
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const UPLOAD_DIR = 'public/uploads/payment_proofs'; // Web-accessible directory

// Ensure upload directory exists
async function ensureUploadDir() {
  const uploadPath = path.join(process.cwd(), UPLOAD_DIR);
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
  return uploadPath;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
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

  return { valid: true };
}

/**
 * Process and save image
 * - Resize to MAX_WIDTH (600px) if larger
 * - Compress to target size
 * - Save to web-accessible directory
 * - Return relative URL (e.g., /uploads/payment_proofs/proof_123_1234567890.jpg)
 */
export async function processAndSaveImage(
  file: File,
  uid: string,
  depositId?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Ensure upload directory exists
    const uploadPath = await ensureUploadDir();

    // Generate unique filename with deposit ID if provided
    const timestamp = Date.now();
    const ext = path.extname(file.name).toLowerCase() || '.jpg';
    const filename = depositId 
      ? `proof_${depositId}_${timestamp}${ext}`
      : `proof_${uid}_${timestamp}${ext}`;
    const filePath = path.join(uploadPath, filename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp
    let image = sharp(buffer);

    // Get image metadata
    const metadata = await image.metadata();
    const width = metadata.width || 0;

    // Resize if width exceeds MAX_WIDTH
    if (width > MAX_WIDTH) {
      image = image.resize(MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Determine format and compression quality
    let quality = 85; // Start with high quality
    const format = ext === '.png' ? 'png' : 'jpeg';

    // Compress image
    if (format === 'jpeg') {
      image = image.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      image = image.png({ compressionLevel: 8, quality });
    }

    // Save initial version
    let outputBuffer = await image.toBuffer();

    // If file is still too large, reduce quality iteratively
    let attempts = 0;
    while (outputBuffer.length > TARGET_FILE_SIZE && quality > 60 && attempts < 5) {
      quality -= 10;
      attempts++;

      image = sharp(buffer);
      if (width > MAX_WIDTH) {
        image = image.resize(MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (format === 'jpeg') {
        image = image.jpeg({ quality, mozjpeg: true });
      } else if (format === 'png') {
        image = image.png({ compressionLevel: 9, quality });
      }

      outputBuffer = await image.toBuffer();
    }

    // Save to disk
    await fs.writeFile(filePath, outputBuffer);

    // Return relative URL
    const relativeUrl = `/uploads/payment_proofs/${filename}`;

    return { success: true, url: relativeUrl };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image',
    };
  }
}

/**
 * Delete image file
 */
export async function deleteImage(relativeUrl: string): Promise<boolean> {
  try {
    const filename = path.basename(relativeUrl);
    const filePath = path.join(process.cwd(), UPLOAD_DIR, filename);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Client-side validation helper (for use in frontend)
 */
export const ImageValidation = {
  MAX_FILE_SIZE,
  MAX_WIDTH,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
  
  getErrorMessage: (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, JPEG, and PNG files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024} MB`;
    }
    return null;
  },
};
