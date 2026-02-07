import nodemailer from 'nodemailer';

// SMTP Configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use STARTTLS (port 587)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport(SMTP_CONFIG);
};

/**
 * Send email via ProtonMail SMTP
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param body - Email body (plain text or HTML)
 * @returns Promise with send result
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        success: false,
        error: 'Invalid email address format',
      };
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body, // Plain text body
      html: body.replace(/\n/g, '<br>'), // Convert line breaks to HTML
    });

    console.log('[Email Service] Email sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Email Service] Failed to send email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Verify SMTP connection health
 * @returns Promise with connection status
 */
export async function verifyConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Email Service] SMTP connection verified');
    return { success: true };
  } catch (error: any) {
    console.error('[Email Service] SMTP connection failed:', error);
    return {
      success: false,
      error: error.message || 'Connection verification failed',
    };
  }
}

/**
 * Sanitize email body to prevent injection attacks
 * @param body - Raw email body
 * @returns Sanitized body
 */
export function sanitizeEmailBody(body: string): string {
  // Remove potential script tags and dangerous HTML
  return body
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
