import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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
  amount: number; 

  @Column({ type: 'enum', enum: Currency })
  currency: Currency; 

  @Column({ type: 'timestamp' })
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