import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type EvaluationStatus = 'queued' | 'running' | 'completed' | 'failed';

@Entity({ name: 'evaluations' })
export class Evaluation {
  @PrimaryColumn('uuid') evaluationId!: string;
  @Column('uuid') submissionId!: string;
  @Column('uuid', { nullable: true }) assignmentId?: string;
  @Column('uuid') userId!: string;
  @Column() language!: string;
  @Column({ nullable: true }) resourceKey?: string;
  @Column({ type: 'varchar', default: 'queued' }) status!: EvaluationStatus;
  @Column({ type: 'numeric', nullable: true }) score?: number;
  @Column({ type: 'text', nullable: true }) feedback?: string;
  @Column({ nullable: true }) errorCode?: string;
  @Column({ default: 0 }) attempts!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
