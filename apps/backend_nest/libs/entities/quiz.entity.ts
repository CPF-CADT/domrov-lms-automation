import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Class } from './class.entity';
import { QuizResult } from './quiz-result.entity';
import { QuizType } from '../enums/Assessment';
import { BaseEntity } from './base.entity';


@Entity({ name: 'quizzes' })
export class Quiz extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  quizUrl: string; 

  @Column({ length: 255 })
  title: string; 

  @Column({ length: 100, nullable: true })
  accessKey: string; 

  @Column({ type: 'enum', enum: QuizType,default:QuizType.GRADED })
  type: QuizType; 

  @ManyToOne(() => Class)
  @JoinColumn()
  class: Class; 

  @OneToMany(() => QuizResult, (result) => result.quiz)
  results: QuizResult[];
}