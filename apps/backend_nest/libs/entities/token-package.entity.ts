import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Currency } from '../enums/Payment';
import { Payment } from './payment.entity';

@Entity({ name: 'token_packages' })
export class TokenPackage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'float' })
  tokenAmount: number;

  @Column({ type: 'float', default: 0 })
  bonusTokenAmount: number; 

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  currency: Currency;

  @Column({ type: 'float', default: 0 })
  discountInPercent: number;

  @Column({ default: true })
  isActive: boolean; 

  @OneToMany(() => Payment, (payment) => payment.tokenPackage)
  payments: Payment[];
}