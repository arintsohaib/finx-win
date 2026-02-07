export const dynamic = 'force-dynamic';
/**
 * File Serving API - DEPRECATED
 * Files are now served as static assets from the public folder.
 * This endpoint remains for backward compatibility only.
 * 
 * New behavior: Redirects to the static URL in /uploads/
 */

import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathSegments } = await context.params;

    // Build static file URL
    const filePath = pathSegments.join('/');

    // Security: Prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Redirect to static file URL
    // Files in public/uploads/ are accessible via /uploads/ URL
    const staticUrl = filePath.startsWith('uploads/') ? `/${filePath}` : `/uploads/${filePath}`;

    console.log(`[File Serving] Redirecting ${filePath} to static URL: ${staticUrl}`);

    return NextResponse.redirect(new URL(staticUrl, request.url));
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
