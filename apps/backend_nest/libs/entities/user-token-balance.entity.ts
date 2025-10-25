import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { PlatformAIModel } from './platform-ai-model.entity';

@Entity({ name: 'user_token_balances' })
export class UserTokenBalance extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', default: 0 })
  tokenBalance: number; 

  @ManyToOne(() => User)
  @JoinColumn()
  user: User; 

  @ManyToOne(() => PlatformAIModel, (model) => model.userBalances)
  @JoinColumn()
  model: PlatformAIModel;
}