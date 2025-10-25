import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { EvaluationType } from '../enums/Assessment';
import { Submission } from './submission.entity';


@Entity({ name: 'evaluations' })
export class Evaluation extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ type: 'float' })
  score: number; 

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'float', default: 0 })
  penaltyScore: number; 

  @Column({ default: false })
  isApproved: boolean; 

  @Column({ default: false })
  isModified: boolean; 

  @Column({ type: 'enum', enum: EvaluationType })
  evaluationType: EvaluationType

  @Column({ type: 'text', nullable: true })
  aiOutput: string;

  @Column({ length: 100, nullable: true })
  confidencePoint: string; 

  @OneToOne(() => Submission, (submission) => submission.evaluation)
  @JoinColumn()
  submission: Submission; 
}