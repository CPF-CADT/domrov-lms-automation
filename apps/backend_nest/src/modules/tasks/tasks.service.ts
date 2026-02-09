import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class TasksService {
    constructor(private readonly redisService: RedisService) { }

    async enqueueSubmission(submissionId: number) {
        const job = {
            func: 'job_handler.tasks.process_submission', 
            args: [submissionId],
            retry: 3,
        };
        await this.redisService.pushToQueue('submission_queue', job);
    }
}
