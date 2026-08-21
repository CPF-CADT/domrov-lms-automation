import { Tasks } from "../enums/taks.enum";

export interface TaskHandler {
    taskName(): Tasks;
    execute(payload: any): Promise<void>;
}
