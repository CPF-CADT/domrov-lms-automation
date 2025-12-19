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
import { Team } from './team.entity'; // Make sure this import exists
import { Assessment } from './assessment.entity';
import { Evaluation } from './evaluation.entity';
import { SubmissionStatus } from '../enums/Status';
import { SubmissionResource } from './submission-resource.entity';

@Entity({ name: 'submissions' })
export class Submission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submissionTime: Date;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ default: 1 })
  attemptNumber: number;

  @ManyToOne(() => User, { nullable: true }) // Nullable because a Team might submit without a specific user owner context in some designs
  @JoinColumn()
  user: User;

  // --- ADD THIS TO SUPPORT TEAM SUBMISSIONS ---
  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn()
  team: Team;

  @ManyToOne(() => Assessment, (assessment) => assessment.submissions)
  @JoinColumn()
  assessment: Assessment;

  @OneToOne(() => Evaluation, (evaluation) => evaluation.submission)
  evaluation: Evaluation;

  @OneToMany(() => SubmissionResource, (sr) => sr.submission)
  resources: SubmissionResource[];
}