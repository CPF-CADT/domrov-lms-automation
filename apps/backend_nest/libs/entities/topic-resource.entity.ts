import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Topic } from './topic.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'topic_resources' })
export class TopicResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Topic, (topic) => topic.resources)
  @JoinColumn()
  topic: Topic;

  @ManyToOne(() => Resource)
  @JoinColumn()
  resource: Resource; 
}