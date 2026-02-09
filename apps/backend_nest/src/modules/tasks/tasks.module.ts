import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { RedisService } from './redis.service';

@Module({
    providers: [TasksService, RedisService],
    controllers: [TasksController],
    exports: [TasksService], // export if other modules need to push tasks
})
export class TasksModule { }
