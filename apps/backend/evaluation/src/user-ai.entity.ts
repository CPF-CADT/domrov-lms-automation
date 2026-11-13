import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_ai_keys' })
@Index(['userId', 'provider', 'label'], { unique: true })
export class UserAiKey {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ length: 40 }) provider!: string;
  @Column({ length: 120 }) model!: string;
  @Column({ type: 'text' }) apiKey!: string;
  @Column({ length: 120 }) label!: string;
  @Column({ type: 'text', nullable: true }) apiEndpoint?: string;
  @Column({ default: true }) isActive!: boolean;
  @Column({ default: false }) isValid!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
