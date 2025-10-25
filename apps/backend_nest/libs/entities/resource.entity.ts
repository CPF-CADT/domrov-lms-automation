import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ResourceType } from '../enums/Resource';
import { ModuleResource } from './module-resource.entity';
import { TopicResource } from './topic-resource.entity';
import { ClassResource } from './class-resource.entity';
import { SubmissionResource } from './submission-resource.entity';
import { AssessmentResource } from './assessment-resource.entity';

@Entity({ name: 'resources' })
export class Resource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 255 })
  title: string; 

  @Column({ type: 'enum', enum: ResourceType })
  type: ResourceType;

  @Column()
  url: string; 

  @Column({ length: 100 })
  owner: string; 

  @Column({ type: 'text', nullable: true })
  description: string; 

  @OneToMany(() => ModuleResource, (mr) => mr.resource)
  moduleResources: ModuleResource[]; 

  @OneToMany(() => TopicResource, (tr) => tr.resource)
  topicResources: TopicResource[]; 

  @OneToMany(() => AssessmentResource, (ar) => ar.resource)
  assessmentResource: AssessmentResource[]; 

  @OneToMany(() => ClassResource, (cr) => cr.resource)
  classResources: ClassResource[]; 

  @OneToMany(() => SubmissionResource, (sr) => sr.resource)
  submissionResources: SubmissionResource[]; 
}