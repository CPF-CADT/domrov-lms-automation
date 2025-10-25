import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { SubmissionType } from '../enums/Assessment';
import { Class } from './class.entity';
import { PlatformAIModel } from './platform-ai-model.entity';
import { Submission } from './submission.entity';
import { AssessmentResource } from './assessment-resource.entity';


@Entity({ name: 'assessments' })
export class Assessment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 255 })
  title: string; 
  @Column({ type: 'text' })
  instruction: string; 

  @Column({ type: 'timestamp' })
  dueDate: Date; 

  @Column({ type: 'timestamp' })
  startDate: Date; 

  @Column({ type: 'int' })
  maxScore: number; 

  @Column({ type: 'enum', enum: SubmissionType })
  submissionType: SubmissionType; 
  @Column({ default: false })
  allowLate: boolean;

  @Column({ type: 'text', nullable: true })
  evaluationCriteria: string;

  @Column({ type: 'text', nullable: true })
  penaltyCriteria: string;

  @Column({ default: false })
  aiEvaluationEnable: boolean;

  @Column({ default: false })
  allowTeamSubmition: boolean;

  @ManyToOne(() => Class)
  @JoinColumn()
  class: Class; 

  @ManyToOne(() => PlatformAIModel)
  @JoinColumn()
  aiModel: PlatformAIModel; 

  @OneToMany(() => Submission, (submission) => submission.assessment)
  submissions: Submission[];

  @OneToMany(() => AssessmentResource, (ar) => ar.assessment)
  resources: AssessmentResource[];
}