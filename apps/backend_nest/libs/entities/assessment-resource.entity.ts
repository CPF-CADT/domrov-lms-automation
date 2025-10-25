import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Assessment } from './assessment.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'assignment_resources' })
export class AssessmentResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Assessment, (assessment) => assessment.resources)
  @JoinColumn()
  assessment: Assessment; 

  @ManyToOne(() => Resource)
  @JoinColumn()
  resource: Resource; 
}