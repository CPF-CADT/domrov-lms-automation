import { Injectable, OnModuleInit } from "@nestjs/common";
import { EmailAlertTask } from "./jobs/email-alert.job";
import { TaskRegistryService } from "./task-registry.service";
import { PublishAssessmentTask } from "./jobs/publish-assessment.job";

@Injectable()
export class TaskBootstrapService implements OnModuleInit {
    constructor(
        private readonly registry: TaskRegistryService,
        private readonly emailTask: EmailAlertTask,
        private readonly publicAssessmentTask: PublishAssessmentTask,

    ) { }

    onModuleInit() {
        this.registry.register(this.emailTask);
        this.registry.register(this.publicAssessmentTask);
    }
}