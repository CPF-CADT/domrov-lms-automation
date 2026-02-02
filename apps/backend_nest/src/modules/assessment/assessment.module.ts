import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { FileService } from '../file/file.service';

// Entities
import { Assessment } from '../../../libs/entities/assessment/assessment.entity';
import { Submission } from '../../../libs/entities/assessment/submission.entity';
import { AssessmentResource } from '../../../libs/entities/resource/assessment-resource.entity';
import { Resource } from '../../../libs/entities/resource/resource.entity';
import { Class } from '../../../libs/entities/classroom/class.entity';
import { User } from '../../../libs/entities/user/user.entity';
import { Team } from '../../../libs/entities/classroom/team.entity';
import { Enrollment } from '../../../libs/entities/classroom/enrollment.entity';
import { SubmissionResource } from '../../../libs/entities/resource/submission-resource.entity';
import { Evaluation } from '../../../libs/entities/assessment/evaluation.entity';
import { Rubrics } from 'libs/entities/assessment/rubic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment, Submission, SubmissionResource, AssessmentResource,
      Resource, Evaluation, Class, User, Team, Enrollment,Rubrics
    ]),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService, FileService],
  exports: [AssessmentService],
})
export class AssessmentModule {}