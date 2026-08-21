// user-credit-balance.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { User } from '../user/user.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity({ name: 'user_credit_balances' })
// Index for user wallet lookups (critical path for wallet operations)
@Index(['user'])
export class UserCreditBalance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', default: 0 })
  creditBalance: number;

  @OneToOne(() => User, (user) => user.creditBalance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions: WalletTransaction[];
}