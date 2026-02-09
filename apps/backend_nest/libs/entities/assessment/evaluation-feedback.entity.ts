
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';

export enum FeedbackType {
  SUGGESTION = 'suggestion',
  WARNING = 'warning',
  ERROR = 'error',
}

@Entity('evaluation_feedback')
export class EvaluationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Evaluation, (evaluation) => evaluation.feedbacks, {
    onDelete: 'CASCADE',
  })
  evaluation: Evaluation;

  @Column({ type: 'text' })
  filePath: string;

  @Column({ type: 'int', nullable: true })
  startLine: number;

  @Column({ type: 'int', nullable: true })
  endLine: number;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
  })
  feedbackType: FeedbackType;

  @CreateDateColumn()
  createdAt: Date;
}
