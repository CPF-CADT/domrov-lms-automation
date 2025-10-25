import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'submission_resources' })
export class SubmissionResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Submission, (submission) => submission.resources)
  @JoinColumn()
  submission: Submission;

  @ManyToOne(() => Resource)
  @JoinColumn()
  resource: Resource;
}