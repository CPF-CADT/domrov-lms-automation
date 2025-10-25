import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { PlatformAIModel } from './platform-ai-model.entity';

@Entity({ name: 'ai_usage_logs' })
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

    @ManyToOne(() => User, (user) => user.usageLogs)
    @JoinColumn()
    user: User;

    @ManyToOne(() => PlatformAIModel, (model) => model.usageLogs)
    @JoinColumn()
    model: PlatformAIModel;
}