import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'free_evaluation_quota' })
@Index(['userId', 'period'], { unique: true })
export class FreeEvaluationQuota {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar', length: 7 }) period!: string;
  @Column({ type: 'integer', default: 0 }) used!: number;
  @Column({ type: 'integer', default: 0 }) reserved!: number;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
