import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AIUsageLog } from './ai-usage-log.entity';
import { Assessment } from './assessment.entity';

@Entity({ name: 'platform_ai_models' })
export class PlatformAIModel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column()
  apiUrl: string;

  @Column({ type: 'float', nullable: true })
  accuracy: number;

  // Cost per token usage (to calculate how much to deduct from wallet)
  @Column({ type: 'float', default: 1 })
  costPerInputToken: number;

  @Column({ type: 'float', default: 1 })
  costPerOutputToken: number;

  @OneToMany(() => AIUsageLog, (log) => log.model)
  usageLogs: AIUsageLog[];

  @OneToMany(() => Assessment, (assessment) => assessment.aiModel)
  assessments: Assessment[];
}