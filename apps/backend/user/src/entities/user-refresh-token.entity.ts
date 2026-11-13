import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_refresh_token' })
export class UserRefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ length: 2048 })
  refreshToken!: string;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
