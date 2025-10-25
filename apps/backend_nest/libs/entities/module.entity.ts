import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Class } from './class.entity';
import { Topic } from './topic.entity';
import { ModuleResource } from './module-resource.entity';

@Entity({ name: 'modules' })
export class Module extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 255 })
  title: string; 

  @Column({ type: 'text', nullable: true })
  description: string; 

  @ManyToOne(() => Class)
  @JoinColumn()
  class: Class; 

  @OneToMany(() => Topic, (topic) => topic.module)
  topics: Topic[];

  @OneToMany(() => ModuleResource, (mr) => mr.module)
  resources: ModuleResource[];
}