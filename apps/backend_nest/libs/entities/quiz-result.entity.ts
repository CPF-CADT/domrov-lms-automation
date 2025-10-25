import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity({ name: 'quiz_results' })
export class QuizResult extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ type: 'float' })
  score: number; 

  @Column({ type: 'int' })
  durationSec: number; 

  @ManyToOne(() => Quiz, (quiz) => quiz.results)
  @JoinColumn()
  quiz: Quiz; 

  @ManyToOne(() => User)
  @JoinColumn()
  user: User; 

}