import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { TokenPackage } from './token-package.entity';
import { Currency, PaymentMethod } from '../enums/Payment';
import { PaymentStatus } from '../enums/Status';

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'float' })
  amount: number; // Real Money Amount (e.g. $10.00)

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  // Store the External ID from Stripe/PayPal
  @Column({ nullable: true })
  providerTransactionId: string;

  @CreateDateColumn()
  transactionDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToOne(() => TokenPackage)
  @JoinColumn()
  tokenPackage: TokenPackage;
}