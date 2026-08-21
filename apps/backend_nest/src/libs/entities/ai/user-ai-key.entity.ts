import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { User } from '../user/user.entity';
import { AIUsageLog } from './ai-usage-log.entity';

@Entity({ name: 'user_ai_keys' })
// Composite index for critical AI operations: finding active+valid keys (evaluation.service.ts line 393)
@Index(['userId', 'isActive', 'isValid'])
export class UserAIKey extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    // Owner of the key
    @ManyToOne(() => User, (user) => user.aiKeys, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    userId: number;

    // Provider name (openai, anthropic, openrouter, etc.)
    @Column({ length: 50 })
    provider: string;

    // Optional model preference
    @Column({ length: 100, nullable: true })
    model: string;

    // Encrypted API key (AES-256)
    @Column({ type: 'text' })   
    encryptedKey: string;

    // Encrypted API key (AES-256)
    @Column({ type: 'text' ,nullable: true})
    apiEndpoint: string;

    // Whether the key is active
    @Column({ default: true })
    isActive: boolean;

    // TODO check before user uplaod to ensure it valid
    // Whether the key was validated successfully
    @Column({ default: true }) 
    isValid: boolean;

    // Optional label for teacher to identify key
    @Column({ length: 100, nullable: true })
    label: string;

    // Track AI usage logs for this key
    @OneToMany(() => AIUsageLog, (log) => log.userKey)
    usageLogs: AIUsageLog[];
}