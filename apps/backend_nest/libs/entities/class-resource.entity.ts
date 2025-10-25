import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Class } from './class.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'class_resources' })
export class ClassResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Class)
  @JoinColumn()
  class: Class; 

  @ManyToOne(() => Resource)
  @JoinColumn()
  resource: Resource; 
}