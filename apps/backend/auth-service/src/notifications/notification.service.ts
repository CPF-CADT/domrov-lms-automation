import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

export interface CreateNotificationInput {
  userId: number;
  title: string;
  message?: string;
  actionUrl?: string;
  type?: NotificationType;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(input: CreateNotificationInput) {
    const user = await this.users.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException('User not found');
    const notification = this.notifications.create({
      user,
      userId: input.userId,
      title: input.title,
      message: input.message ?? '',
      actionUrl: input.actionUrl,
      type: input.type ?? NotificationType.INFO,
      status: NotificationStatus.UNREAD,
    });
    return this.notifications.save(notification);
  }

  listForUser(userId: number) {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  unreadForUser(userId: number) {
    return this.notifications.find({
      where: { userId, status: NotificationStatus.UNREAD },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.notifications.findOne({ where: { id: notificationId, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.status !== NotificationStatus.READ) {
      notification.status = NotificationStatus.READ;
      await this.notifications.save(notification);
    }
    return { message: 'Notification marked as read' };
  }
}
