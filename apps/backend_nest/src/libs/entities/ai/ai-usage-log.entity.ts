import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { User } from '../user/user.entity';
import { UserAIKey } from './user-ai-key.entity';

@Entity({ name: 'ai_usage_logs' })
// Index for user AI usage tracking
@Index(['user'])
export class AIUsageLog extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ length: 255 })
    title: string;

    @Column({ type: 'timestamp' })
    usingDate: Date;

    @Column({ type: 'int' })
    inputTokenCount: number;

    @Column({ type: 'int' })
    outputTokenCount: number;

    @ManyToOne(() => User, (user) => user.usageLogs, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    // Which AI key was used
    @ManyToOne(() => UserAIKey, (key) => key.usageLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_ai_key_id' })
    userKey: UserAIKey;

}