import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return items.map((n) => {
      let meta = undefined;
      try {
        if (n.metadata) meta = JSON.parse(n.metadata);
      } catch {
        meta = undefined;
      }

      return {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.createdAt.getTime(),
        read: n.read,
        actionUrl: n.actionUrl || undefined,
        metadata: meta,
      };
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async clearNotifications(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { success: true };
  }
}
