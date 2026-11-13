import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../src/notifications/notification.service';
import { Notification, NotificationStatus, NotificationType } from '../src/entities/notification.entity';
import { User } from '../src/entities/user.entity';
import { AdminUserService } from '../src/admin/admin-user.service';

describe('Auth-owned notifications and admin users', () => {
  it('lists unread notifications and marks only the owner notification as read', async () => {
    const notifications = {
      find: jest.fn().mockResolvedValue([{ id: 1, userId: 7, status: NotificationStatus.UNREAD }]),
      findOne: jest.fn().mockResolvedValue({ id: 1, userId: 7, status: NotificationStatus.UNREAD }),
      save: jest.fn(async (value) => value),
    };
    const users = { findOne: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: notifications },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    const service = module.get(NotificationService);

    await expect(service.unreadForUser(7)).resolves.toEqual([{ id: 1, userId: 7, status: NotificationStatus.UNREAD }]);
    await expect(service.markAsRead(7, 1)).resolves.toEqual({ message: 'Notification marked as read' });
    expect(notifications.save).toHaveBeenCalledWith(expect.objectContaining({ status: NotificationStatus.READ }));
    expect(notifications.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7, status: NotificationStatus.UNREAD } }));
  });

  it('creates a persisted unread notification using auth_db user ownership', async () => {
    const notifications = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 5, ...value })),
    };
    const user = { id: 7, email: 'user@example.com' } as User;
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: notifications },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    const service = module.get(NotificationService);

    await expect(service.create({ userId: 7, title: 'Welcome', type: NotificationType.INFO })).resolves.toMatchObject({ id: 5, userId: 7 });
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ user, userId: 7, status: NotificationStatus.UNREAD }));
  });

  it('returns paginated public user data without password fields', async () => {
    const users = {
      createQueryBuilder: jest.fn(() => {
        const builder: any = {
          andWhere: jest.fn(() => builder),
          orderBy: jest.fn(() => builder),
          skip: jest.fn(() => builder),
          take: jest.fn(() => builder),
          getManyAndCount: jest.fn().mockResolvedValue([[{ id: 7, email: 'user@example.com', password: 'secret', role: 'User' }], 1]),
        };
        return builder;
      }),
    };
    const module = await Test.createTestingModule({
      providers: [AdminUserService, { provide: getRepositoryToken(User), useValue: users }],
    }).compile();
    const service = module.get(AdminUserService);

    const result = await service.list({ page: '1', limit: '10' });
    expect(result).toMatchObject({ total: 1, page: 1, limit: 10 });
    expect(result.data[0]).not.toHaveProperty('password');
  });
});
