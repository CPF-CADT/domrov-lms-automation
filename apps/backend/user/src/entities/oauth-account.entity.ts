import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'oauth_accounts' })
@Unique('UQ_oauth_account_provider_account', ['provider', 'accountId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 32 })
  provider!: string;

  @Column({ name: 'account_id', length: 255 })
  accountId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  @CreateDateColumn()
  created_at!: Date;
}
