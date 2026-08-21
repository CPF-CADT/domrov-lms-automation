// credit-package.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Currency } from '../../enums/Payment';
import { Payment } from './payment.entity';

@Entity({ name: 'credit_packages' })
export class CreditPackage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'float' })
  credits: number;

  @Column({ type: 'float', default: 0 })
  bonusCredits: number;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  currency: Currency;

  @Column({ type: 'float', default: 0 })
  discountInPercent: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  sortOrder?: number;

  @OneToMany(() => Payment, (payment) => payment.creditPackage)
  payments: Payment[];
}