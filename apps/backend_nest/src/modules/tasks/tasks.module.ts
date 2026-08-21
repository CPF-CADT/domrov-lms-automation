import { forwardRef, Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailAlertTask } from './jobs/email-alert.job';
import { TaskProcessor } from './task-processor';
import { TaskBootstrapService } from './task.bootstrap';
import { TaskRegistryService } from './task-registry.service';
import { PublishAssessmentTask } from './jobs/publish-assessment.job';
import { AssessmentModule } from '../assessment/assessment.module';

@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    url: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
                    retryStrategy: (times) => Math.min(times * 50, 2000),
                },
            }),

        }),
        BullModule.registerQueue({ name: 'task-scheduler' }),
        forwardRef(() => AssessmentModule),
    ],
    providers: [
        TasksService,
        TaskRegistryService,
        TaskBootstrapService,
        TaskProcessor,
        EmailAlertTask,
        PublishAssessmentTask
    ],

    exports: [TasksService],
})
export class TasksModule { }