import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlatformAIModel } from './platform-ai-model.entity';
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

  @Column({ type: 'float' })
  price: number; 

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  currency: Currency; 

  @Column({ type: 'float', default: 0 })
  discountInPercent: number; 

  @ManyToOne(() => PlatformAIModel, (model) => model.tokenPackages)
  @JoinColumn()
  model: PlatformAIModel; 

  @OneToMany(() => Payment, (payment) => payment.tokenPackage)
  payments: Payment[];
}