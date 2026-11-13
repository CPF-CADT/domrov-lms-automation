import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicService } from './academic.service';
import { AsyncEvaluationClient } from './ai-client';
import { JwtBoundaryGuard } from './auth';
import { ClassesController, TeamsController, AssignmentsController, SubmissionsController, LegacyClassController, LegacyTeamController, LegacyAssessmentController, LegacySubmissionController, LegacyFileController } from './controllers';
import { HealthController, MetricsController } from './health';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from './entities';
import { AcademicStorageService, LocalStorageAdapter, R2StorageAdapter } from './storage';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: 'postgres', url: config.getOrThrow<string>('DATABASE_URL'), entities: [AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission], synchronize: false }) }), TypeOrmModule.forFeature([AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission])],
  controllers: [ClassesController, TeamsController, AssignmentsController, SubmissionsController, LegacyClassController, LegacyTeamController, LegacyAssessmentController, LegacySubmissionController, LegacyFileController, HealthController, MetricsController],
  providers: [AcademicService, JwtBoundaryGuard, AsyncEvaluationClient, LocalStorageAdapter, R2StorageAdapter, AcademicStorageService, { provide: 'EvaluationClient', useExisting: AsyncEvaluationClient }],
})
export class AppModule {}
