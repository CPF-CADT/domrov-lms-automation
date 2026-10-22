import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ResourceType } from '../../enums/Resource';
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

  @Column({ length: 32, nullable: true })
  storageProvider: string;

  @Column({ length: 255, nullable: true })
  contentType: string;

  @Column({ type: 'bigint', nullable: true })
  size: number;

  @Column({ length: 64, nullable: true })
  checksum: string;

  @Column({ length: 100 })
  owner: string; 

  @Column({ type: 'text', nullable: true })
  description: string; 

  @OneToMany(() => AssessmentResource, (ar) => ar.resource)
  assessmentResource: AssessmentResource[]; 

  @OneToMany(() => SubmissionResource, (sr) => sr.resource)
  submissionResources: SubmissionResource[]; 
}
