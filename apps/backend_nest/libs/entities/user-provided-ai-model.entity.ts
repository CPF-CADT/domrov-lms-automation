import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'user_provided_ai_models' })
export class UserProvidedAIModel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column()
  key: string; 

  @Column()
  url: string; 

  @ManyToOne(() => User)
  @JoinColumn()
  owner: User; 

}