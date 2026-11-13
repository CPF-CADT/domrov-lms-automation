import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
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
@Index(['userId', 'status'])
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.INFO })
  type!: NotificationType;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status!: NotificationStatus;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ name: 'action_url', length: 500, nullable: true })
  actionUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
