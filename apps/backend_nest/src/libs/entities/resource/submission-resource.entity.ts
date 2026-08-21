import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Submission } from '../assessment/submission.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'submission_resources' })
export class SubmissionResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Submission, (submission) => submission.resources, { onDelete: 'CASCADE' })
  @JoinColumn()
  submission: Submission;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn()
  resource: Resource;
}