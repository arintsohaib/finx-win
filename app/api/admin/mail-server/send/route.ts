export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hasPermission, PERMISSIONS, AdminJWTPayload } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { sendEmail, sanitizeEmailBody } from '@/lib/email-service';
/**
 * POST /api/admin/mail-server/send
 * Send email to a user via ProtonMail SMTP
 * Body: { recipientUid: string, subject: string, body: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(req);
    if ('error' in adminResult) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const admin = adminResult as AdminJWTPayload;

    // Check permission
    if (!hasPermission(admin, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { recipientUid, subject, body: messageBody } = body;

    // Validate required fields
    if (!recipientUid || !subject || !messageBody) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['recipientUid', 'subject', 'body'],
        },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject cannot be empty' },
        { status: 400 }
      );
    }

    if (messageBody.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message body must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: 'Subject must be less than 200 characters' },
        { status: 400 }
      );
    }

    if (messageBody.length > 5000) {
      return NextResponse.json(
        { error: 'Message body must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Fetch recipient from database
    const user = await prisma.user.findFirst({
      where: {
        uid: recipientUid,
        kycStatus: 'approved', // Only send to KYC-approved users
      },
      select: {
        uid: true,
        walletAddress: true,
        kycSubmissions: {
          where: {
            status: 'approved',
          },
          select: {
            email: true,
            fullName: true,
          },
          take: 1,
        },
      },
    });

    if (!user || user.kycSubmissions.length === 0) {
      return NextResponse.json(
        { error: 'Recipient not found or not KYC verified' },
        { status: 404 }
      );
    }

    const recipient = {
      uid: user.uid,
      walletAddress: user.walletAddress,
      email: user.kycSubmissions[0].email,
      fullName: user.kycSubmissions[0].fullName,
    };

    if (!recipient.email) {
      return NextResponse.json(
        { error: 'Recipient does not have a valid email address' },
        { status: 400 }
      );
    }

    // Sanitize email body to prevent injection attacks
    const sanitizedBody = sanitizeEmailBody(messageBody);

    // Send email
    console.log(
      `[Mail Server] Sending email to ${recipient.email} (UID: ${recipient.uid})`
    );
    console.log(`[Mail Server] Admin: ${admin.username} (ID: ${admin.id})`);
    console.log(`[Mail Server] Subject: ${subject}`);

    const result = await sendEmail(recipient.email, subject, sanitizedBody);

    if (!result.success) {
      console.error('[Mail Server] Email send failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    console.log(
      `[Mail Server] Email sent successfully to ${recipient.email} (Message ID: ${result.messageId})`
    );

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      recipient: {
        uid: recipient.uid,
        email: recipient.email,
        name: recipient.fullName,
      },
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('[Mail Server] Send email failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
