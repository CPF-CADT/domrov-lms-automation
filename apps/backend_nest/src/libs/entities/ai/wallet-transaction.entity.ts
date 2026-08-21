// wallet-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { UserCreditBalance } from './user-credit-balance.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  PURCHASE = 'purchase',
}

export enum TransactionReason {
  AI_USAGE = 'ai_usage',
  PURCHASE = 'purchase',
  REFUND = 'refund',
  BONUS = 'bonus',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

@Entity({ name: 'wallet_transactions' })
// Index for wallet transaction history lookups
@Index(['wallet'])
export class WalletTransaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  walletId?: number;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionReason, nullable: true })
  reason?: TransactionReason;

  @Column({ type: 'float', nullable: true })
  balanceBefore?: number;

  @Column({ type: 'float' })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => UserCreditBalance, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: UserCreditBalance;
}