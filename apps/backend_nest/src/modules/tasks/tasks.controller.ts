import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('tasks') // Group in Swagger UI
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post('enqueue')
    @ApiOperation({ summary: 'Push a submission task to Redis queue' })
    @ApiBody({
        description: 'Submission ID to enqueue',
        schema: {
            type: 'object',
            properties: {
                submissionId: { type: 'number', example: 123 },
            },
            required: ['submissionId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Task successfully pushed to Redis' })
    @ApiResponse({ status: 400, description: 'Invalid submissionId' })
    async enqueue(@Body('submissionId') submissionId: number) {
        await this.tasksService.enqueueSubmission(submissionId);
        return { message: 'Task pushed to Redis', submissionId };
    }
}
