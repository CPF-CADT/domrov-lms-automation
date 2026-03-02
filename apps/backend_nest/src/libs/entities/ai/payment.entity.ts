// payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { User } from '../user/user.entity';
import { CreditPackage } from './credit-package.entity';
import { Currency, PaymentMethod } from '../../enums/Payment';
import { PaymentStatus } from '../../enums/Status';

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'float' })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.USD,
  })
  currency: Currency;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  imgProof?: string;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ type: 'jsonb', nullable: true })
  transactionDetails?: {
    hash: string;
    fromAccountId: string;
    toAccountId: string;
    currency: string;
    amount: number;
    description: string;
    createdDateMs: number;
    acknowledgedDateMs: number;
    trackingStatus?: string;
    receiverBank?: string;
    receiverBankAccount?: string;
    proofImageUrl?: string;
  };

  @ManyToOne(() => User, (user) => user.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => CreditPackage, (pkg) => pkg.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'creditPackageId' })
  creditPackage?: CreditPackage;
}