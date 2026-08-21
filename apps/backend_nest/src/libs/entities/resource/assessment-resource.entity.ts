import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Assessment } from '../assessment/assessment.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'assessment_resources' })
export class AssessmentResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Assessment, (assessment) => assessment.resources, { onDelete: 'CASCADE' })
  @JoinColumn()
  assessment: Assessment;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn()
  resource: Resource;
}