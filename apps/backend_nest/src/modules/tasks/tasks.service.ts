import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Tasks } from '../../libs/enums/taks.enum';

@Injectable()
export class TasksService {
    constructor(@InjectQueue('task-scheduler') private readonly taskQueue: Queue) {}

    async scheduleTask(taskName: Tasks, payload: any, delayMs: number) {
        await this.taskQueue.add(taskName, payload, { delay: delayMs });
    }
}