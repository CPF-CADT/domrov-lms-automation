import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { User } from '../user/user.entity';
import { Team } from '../classroom/team.entity'; // Make sure this import exists
import { Assessment } from './assessment.entity';
import { Evaluation } from './evaluation.entity';
import { SubmissionStatus } from '../../enums/Status';
import { SubmissionResource } from '../resource/submission-resource.entity';

@Entity({ name: 'submissions' })
// Composite index for critical student submission lookup (3+ queries in submission.service)
@Index(['assessment', 'user'])
// Composite index for team submission operations (3+ queries in submission.service)
@Index(['assessment', 'team'])
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

  @Column({
    nullable: true
  })
  comments: string

  @Column({ default: 1 })
  attemptNumber: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ nullable: true })
  teamId: number;

  @ManyToOne(() => Assessment, (assessment) => assessment.submissions, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @Column()
  assessmentId: number;


  @OneToOne(() => Evaluation, (evaluation) => evaluation.submission)
  evaluation: Evaluation;

  @OneToMany(() => SubmissionResource, (sr) => sr.submission)
  resources: SubmissionResource[];
}

