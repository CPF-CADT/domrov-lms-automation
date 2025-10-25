import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Module } from './module.entity';
import { TopicResource } from './topic-resource.entity';

@Entity({ name: 'topics' })
export class Topic extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 255 })
  title: string; 

  @Column({ type: 'text', nullable: true })
  description: string; 

  @ManyToOne(() => Module, (module) => module.topics)
  @JoinColumn()
  module: Module; 

  @OneToMany(() => TopicResource, (tr) => tr.topic)
  resources: TopicResource[];
}