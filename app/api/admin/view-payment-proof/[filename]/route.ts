export const dynamic = 'force-dynamic'; // Triggering build cache test
/**
 * Admin Payment Proof Viewer API
 * 
 * Serves payment proof images to authenticated admin users only
 * - No Web3 JWT interference
 * - Uses admin_token cookie for authentication
 * - Checks multiple upload directories for backwards compatibility:
 *   1. public/uploads/payment_proofs/ (new location)
 *   2. public/uploads/deposits/ (legacy location)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import fs from 'fs/promises';
import path from 'path';
export async function GET(request: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;

    // Security: Ensure only authenticated admins can view proofs
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Security: Validate filename (prevent directory traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Security: Ensure filename has valid image extension
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExtension = validExtensions.some(ext =>
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Try multiple directories (for backwards compatibility)
    const possiblePaths = [
      path.join(process.cwd(), 'public/uploads/payment_proofs', filename),
      path.join(process.cwd(), 'public/uploads/deposits', filename),
    ];

    let filePath: string | null = null;

    // Check each possible path until we find the file
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        break; // Found the file
      } catch {
        // File not found in this location, try next
        continue;
      }
    }

    // If file not found in any location
    if (!filePath) {
      return NextResponse.json(
        { error: 'File not found in any upload directory' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    }

    // Return image with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error serving payment proof:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
