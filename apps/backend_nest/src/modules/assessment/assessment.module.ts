import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { FileService } from '../file/file.service';

// Entities
import { Assessment } from '../../../libs/entities/assessment.entity';
import { Submission } from '../../../libs/entities/submission.entity';
import { SubmissionResource } from '../../../libs/entities/submission-resource.entity';
import { AssessmentResource } from '../../../libs/entities/assessment-resource.entity';
import { Resource } from '../../../libs/entities/resource.entity';
import { Evaluation } from '../../../libs/entities/evaluation.entity';
import { Class } from '../../../libs/entities/class.entity';
import { User } from '../../../libs/entities/user.entity';
import { Team } from '../../../libs/entities/team.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment, Submission, SubmissionResource, AssessmentResource,
      Resource, Evaluation, Class, User, Team, Enrollment
    ]),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService, FileService],
  exports: [AssessmentService],
})
export class AssessmentModule {}