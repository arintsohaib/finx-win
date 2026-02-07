export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadChatMessageFile } from '@/lib/file-upload';
import { prisma } from '@/lib/db';
/**
 * POST /api/chat/upload
 * Upload a chat attachment
 */
export async function POST(request: NextRequest) {
    try {
        const userToken = request.cookies.get('auth-token')?.value;
        const adminToken = request.cookies.get('admin_token')?.value;

        if (!userToken && !adminToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        let payload: any = null;
        let isAdmin = false;

        // Try validating as User first
        if (userToken) {
            payload = verifyToken(userToken);
        }

        // If not a valid user (or no user token), try Admin
        if (!payload && adminToken) {
            // We need to verify verifyAdminToken is available. 
            // Since we can't easily change imports in replace_file without re-writing the whole file, 
            // we will use dynamic import or assume verifyAdminToken is needed.
            // Actually, verifyAdminToken is in lib/admin-auth.ts. 
            // We need to import it.
            // We can use verifyAdminToken from '@/lib/admin-auth' if we add the import.
            // But let's create a helper block here.
            const { verifyAdminToken } = require('@/lib/admin-auth');
            payload = verifyAdminToken(adminToken);
            if (payload) isAdmin = true;
        }

        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Since this can be used by both user and admin, we check the payload
        // User payload has walletAddress
        // Admin payload (if verifyToken handles it) or a separate admin check
        // Actually verifyToken in this project seems to return the payload if valid.

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // identifier for the filename
        const identifier = (payload as any).walletAddress || (payload as any).id || 'unknown';

        const uploadResult = await uploadChatMessageFile(file, identifier);

        if (!uploadResult.success) {
            return NextResponse.json(
                { error: uploadResult.error || 'Failed to upload file' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            fileUrl: uploadResult.url,
            fileName: file.name,
        });

    } catch (error) {
        console.error('Chat file upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
