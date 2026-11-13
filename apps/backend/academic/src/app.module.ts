import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicService } from './academic.service';
import { AsyncEvaluationClient } from './ai-client';
import { JwtBoundaryGuard } from './auth';
import { ClassesController, TeamsController, AssignmentsController, SubmissionsController, LegacyClassController, LegacyTeamController, LegacyAssessmentController, LegacySubmissionController, LegacyFileController } from './controllers';
import { AcademicAdminController } from './admin.controller';
import { HealthController, MetricsController } from './health';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from './entities';
import { AcademicStorageService, LocalStorageAdapter, R2StorageAdapter } from './storage';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AI_RABBITMQ_CLIENT, EvaluationEventsController, EvaluationPublisher } from './messaging/rabbitmq';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ClientsModule.registerAsync([{ name: AI_RABBITMQ_CLIENT, imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ transport: Transport.RMQ, options: { urls: [config.getOrThrow<string>('RABBITMQ_URL')], queue: config.get<string>('RABBITMQ_AI_REQUEST_QUEUE', 'academic-ai-publisher'), exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic', wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } }) }]), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: 'postgres', url: config.getOrThrow<string>('DATABASE_URL'), entities: [AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission], synchronize: false }) }), TypeOrmModule.forFeature([AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission])],
  controllers: [ClassesController, TeamsController, AssignmentsController, SubmissionsController, LegacyClassController, LegacyTeamController, LegacyAssessmentController, LegacySubmissionController, LegacyFileController, AcademicAdminController, HealthController, MetricsController, EvaluationEventsController],
  providers: [AcademicService, JwtBoundaryGuard, AsyncEvaluationClient, EvaluationPublisher, LocalStorageAdapter, R2StorageAdapter, AcademicStorageService, { provide: 'EvaluationClient', useExisting: AsyncEvaluationClient }],
})
export class AppModule {}
