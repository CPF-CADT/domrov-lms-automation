import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskRegistryService } from './task-registry.service';
import { Tasks } from '../../libs/enums/taks.enum';

@Processor('task-scheduler')
export class TaskProcessor extends WorkerHost {
    constructor(private readonly taskRegistry: TaskRegistryService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const handler = this.taskRegistry.get(job.name as Tasks);
        return handler.execute(job.data);
    }
}