import { Injectable } from '@nestjs/common';
import { TaskHandler } from '../../libs/interfaces/task-handler';
import { Tasks } from '../../libs/enums/taks.enum';

@Injectable()
export class TaskRegistryService {
    private handlers = new Map<Tasks, TaskHandler>();

    register(handler: TaskHandler) {
        this.handlers.set(handler.taskName(), handler);
    }

    get(name: Tasks): TaskHandler {
        const handler = this.handlers.get(name);
        if (!handler) throw new Error(`Task handler ${name} not found`);
        return handler;
    }
}