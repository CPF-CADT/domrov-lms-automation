import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ALERT = 'alert',
}

export enum NotificationStatus {
    UNREAD = 'unread',
    READ = 'read',
}

@Entity({ name: 'notifications' })
// Composite index for unread notification queries (user + status filters)
@Index(['user', 'status'])
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: NotificationType, default: NotificationType.INFO })
    type: NotificationType;

    @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.UNREAD })
    status: NotificationStatus;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}