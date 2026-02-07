
import { prisma } from '@/lib/db';

export async function createNotification({
  walletAddress,
  type,
  title,
  message,
  link,
}: {
  walletAddress: string;
  type: 'trade' | 'deposit' | 'withdrawal' | 'conversion' | 'chat' | 'system';
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        walletAddress,
        type,
        title,
        message,
        link,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function getUnreadNotificationCount(walletAddress: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        walletAddress,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}
