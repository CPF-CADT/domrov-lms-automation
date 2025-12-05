import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity({ name: 'user_token_balances' })
export class UserTokenBalance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', default: 0 })
  tokenBalance: number;

  // Changed to OneToOne: One user has exactly one wallet
  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  // Link to transaction history
  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions: WalletTransaction[];
}