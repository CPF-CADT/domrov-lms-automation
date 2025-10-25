import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Assessment } from './assessment.entity';
import { Evaluation } from './evaluation.entity';
import { SubmissionStatus } from '../enums/Status';
import { SubmissionResource } from './submission-resource.entity';

@Entity({ name: 'submissions' })
export class Submission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ type: 'timestamp' })
  submissionTime: Date; 

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus; 

  @ManyToOne(() => User)
  @JoinColumn()
  user: User; 

  @ManyToOne(() => Assessment, (assessment) => assessment.submissions)
  @JoinColumn()
  assessment: Assessment; 

  @OneToOne(() => Evaluation, (evaluation) => evaluation.submission)
  evaluation: Evaluation;

  @OneToMany(() => SubmissionResource, (sr) => sr.submission)
  resources: SubmissionResource[];
}