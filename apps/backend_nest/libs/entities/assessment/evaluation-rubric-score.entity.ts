import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Evaluation } from './evaluation.entity';

@Entity('evaluation_rubric_scores')
export class EvaluationRubricScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rubricId: number; // Links to your Rubric definition

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

@ManyToOne(() => Evaluation, (evaluation) => evaluation.rubricScores, {
  onDelete: 'CASCADE',
})
evaluation: Evaluation;
}