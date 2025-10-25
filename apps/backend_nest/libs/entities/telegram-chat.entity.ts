import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'telegram_chats' })
export class TelegramChat extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ unique: true })
  chatId: string; 

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;
}