import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserTokenBalance } from './user-token-balance.entity';
import { Payment } from './payment.entity';

export enum TransactionType {
    PURCHASE = 'PURCHASE',   // Bought tokens
    SPEND = 'SPEND',         // Used AI
    REFUND = 'REFUND',       // Admin refunded
    GIFT = 'GIFT',           // Sent to another user
    BONUS = 'BONUS'          // System reward
}

@Entity({ name: 'wallet_transactions' })
export class WalletTransaction extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'float' })
    amount: number; // Positive for add, Negative for deduct

    @Column({ type: 'float' })
    balanceAfter: number; // Snapshot of balance after tx

    @Column({ nullable: true })
    description: string; // e.g. "Usage for GPT-4", "Gold Package Purchase"

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => UserTokenBalance, (wallet) => wallet.transactions)
    @JoinColumn()
    wallet: UserTokenBalance;

    // Optional: Link to a specific Payment if this was a Purchase
    @ManyToOne(() => Payment, { nullable: true })
    @JoinColumn()
    payment: Payment;
}