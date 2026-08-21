import { Injectable } from '@nestjs/common';
import { TaskHandler } from '../../../libs/interfaces/task-handler';
import { Tasks } from '../../../libs/enums/taks.enum';
import { AssessmentContext } from '../../../common/security';
import { AssessmentService } from '../../assessment/assessment.service';

@Injectable()
export class PublishAssessmentTask implements TaskHandler {
    constructor(private readonly assessmentService:AssessmentService) {
        
    }
    taskName() {
        return Tasks.PUBLIC_ASSIGNMENT;
    }

    async execute(payload: { context: AssessmentContext }) {
        console.log('Publishing assessment', payload.context.assessmentId);
        // your logic here
        await this.assessmentService.publishAssessment(payload.context);
    }
}