import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';

// Entities
import { Assessment } from '../../libs/entities/assessment/assessment.entity';
import { Resource } from '../../libs/entities/resource/resource.entity';
import { AssessmentResource } from '../../libs/entities/resource/assessment-resource.entity';
import { Enrollment } from '../../libs/entities/classroom/enrollment.entity';
import { Rubrics } from '../../libs/entities/assessment/rubic.entity';
import { Submission } from '../../libs/entities/assessment/submission.entity';

// Enums & DTOs
import { UpdateAssessmentDTO } from '../../libs/dtos/assessment/update-assessment.dto';
import { SubmissionMethod, SubmissionType } from '../../libs/enums/Assessment';
import {
  CreateDraftResponseDto,
  PublishAssessmentResponseDto,
  UpdateAssessmentResponseDto,
  AssessmentListItemDto,
  AssessmentDetailDto,
  TeamTrackingItemDto,
  IndividualTrackingItemDto,
  DeleteAssessmentResponseDto,
} from '../../libs/dtos/assessment/assessment-response.dto';
import { SubmissionService } from './submission.service';
import { Team } from '../../libs/entities/classroom/team.entity';
import { TeamAssessment } from '../../libs/entities/classroom/team-assessment.entity';
import type { AssessmentContext, ClassContext } from '../../common/security/dtos/guard.dto';
import { UserRole } from '../../libs/enums/Role';
import { TasksService } from '../tasks/tasks.service';
import { Tasks } from '../../libs/enums/taks.enum';
import { getDelayFromNow } from '../../libs/utils/CustomDateTime';

// Services
@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    private readonly submissionService: SubmissionService,
    private readonly taskService: TasksService,
    private readonly dataSource: DataSource,

  ) { }

  async createDraft(session: number, context: ClassContext): Promise<CreateDraftResponseDto> {
    if (!context.classEntity) throw new NotFoundException('Class context not available');
    try {
      const assessment = await this.assessmentRepo.save({
        title: 'Untitled Assignment',
        instruction: '',
        maxScore: 0,
        submissionType: SubmissionType.INDIVIDUAL,
        allowLate: false,
        session: session,
        allowTeamSubmition: false,
        startDate: new Date(),
        dueDate: new Date(),
        isPublic: false,
        class: context.classEntity,
        aiEvaluationEnable: false,
        allowedSubmissionMethod: SubmissionMethod.ANY,
      });
      return { message: 'Draft created', assessmentId: assessment.id };
    } catch (err) {
      throw new BadRequestException('Failed to create draft');
    }
  }

  // assessment.service.ts

  async publishAssessment(context: AssessmentContext): Promise<PublishAssessmentResponseDto> {
    try {
      const assessment = await this.assessmentRepo.findOne({
        where: { id: context.assessmentId },
        relations: ['class', 'rubrics'],
      });

      if (!assessment) throw new BadRequestException('Failed to publish assessment');

      // Perform validation (ensure this helper doesn't throw unexpectedly)
      this.validateAssessmentForPublishing(assessment);

      const wasAlreadyPublic = assessment.isPublic;
      const oldType = assessment.submissionType;
      const newType = context.assessmentEntity.submissionType;
      if (wasAlreadyPublic) {
        if (oldType !== newType) {
          await this.submissionRepo.delete({ assessment: { id: assessment.id } });
          assessment.submissionType = newType;
          const updated = await this.assessmentRepo.save(assessment);
          await this.submissionService.createSubmissionsForAssessment(updated);
          console.log(`Assessment ${assessment.id} republished with new submission type. Old: ${oldType}, New: ${newType}`);
        } else {
          // CONTENT ONLY: Just save, do NOT call submissionService
          await this.assessmentRepo.save(assessment);
        }
        return { message: 'Assessment updated successfully' };
      }

      // FIRST TIME PUBLISH
      assessment.isPublic = true;
      assessment.submissionType = newType;
      const saved = await this.assessmentRepo.save(assessment);
      await this.submissionService.createSubmissionsForAssessment(saved);

      return { message: 'Assessment published successfully' };
    } catch (err) {
      // Log the actual error here for debugging if needed: console.error(err);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to publish assessment');
    }
  }

  private validateAssessmentForPublishing(assessment: Assessment) {
    if (!assessment.title?.trim()) throw new BadRequestException('Title is required');
    if (!assessment.instruction?.trim()) throw new BadRequestException('Instruction is required');
    if (!assessment.maxScore || assessment.maxScore <= 0) throw new BadRequestException('Max score must be greater than 0');
    if (!assessment.startDate || !assessment.dueDate) throw new BadRequestException('Dates are required');
    if (assessment.startDate >= assessment.dueDate) throw new BadRequestException('Invalid date range');

    const totalRubricScore = assessment.rubrics?.reduce((sum, r) => sum + r.totalScore, 0) || 0;
    if (totalRubricScore !== assessment.maxScore) {
      throw new BadRequestException('Rubric total score must equal maxScore');
    }
  }

  async updateAssessment(dto: UpdateAssessmentDTO, context: AssessmentContext): Promise<UpdateAssessmentResponseDto> {
    try {
      // 1. Fetch the existing assessment with necessary relations
      const assessment = await this.assessmentRepo.findOne({
        where: { id: context.assessmentId },
        relations: ['class', 'resources', 'resources.resource'],
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      const { resources, rubrics, ...metadata } = dto;

      // 2. Merge metadata onto the assessment entity
      Object.assign(assessment, metadata);

      // 3. Execute all updates within a single transaction
      const updatedAssessment = await this.dataSource.manager.transaction(async (manager) => {

        // Save the primary assessment metadata
        await manager.save(Assessment, assessment);

        // If the DTO specifies to publish, call the publish logic within the transaction
        if (dto.isPublic && dto.startDate && new Date(dto.startDate).getTime() > Date.now()) {
          await this.taskService.scheduleTask(
            Tasks.PUBLIC_ASSIGNMENT,
            { context },
            getDelayFromNow(new Date(dto.startDate))
          );
        } else if (dto.isPublic) {
          await this.publishAssessment(context)
        }
        // Handle Resources (Association Table)
        if (resources?.length) {
          for (const r of resources) {
            const resource = await manager.findOne(Resource, { where: { id: r.resourceId } });
            if (!resource) {
              throw new BadRequestException(`Resource ${r.resourceId} not found`);
            }

            const exists = assessment.resources?.some((ar) => ar.resource.id === r.resourceId);
            if (!exists) {
              const ar = manager.create(AssessmentResource, { assessment, resource });
              await manager.save(AssessmentResource, ar);
              assessment.resources.push(ar);
            }
          }
        }

        // Handle Rubrics (Sync logic: Delete and Re-create)
        if (rubrics) {
          await manager.delete(Rubrics, { assessment: { id: assessment.id } });

          const rubricEntities = rubrics.map((rubricDto) =>
            manager.create(Rubrics, {
              definition: rubricDto.definition, // Mapping DTO 'definition' to Entity 'definition'
              totalScore: rubricDto.totalScore, // Mapping DTO 'totalScore' to Entity 'totalScore'
              assessment,
            })
          );

          await manager.save(Rubrics, rubricEntities);
        }

        // Handle Team Assessments (Sync logic: Delete and Re-create)
        await manager.delete(TeamAssessment, { assessment: { id: assessment.id } });

        if (dto.allowedTeamIds?.length) {
          const teams = await manager.findBy(Team, { id: In(dto.allowedTeamIds) });
          const newTeamAssessments = teams.map(team =>
            manager.create(TeamAssessment, { team, assessment })
          );
          await manager.save(TeamAssessment, newTeamAssessments);
        }

        return assessment;
      });

      return {
        message: 'Draft updated successfully',
        assessment: {
          ...updatedAssessment,
          resources: updatedAssessment.resources || []
        },
      };

    } catch (err) {
      // Re-throw known NestJS exceptions
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      // Log unexpected errors here for debugging
      throw new BadRequestException('Failed to update assessment');
    }
  }



  async getTracking(context: AssessmentContext): Promise<TeamTrackingItemDto[] | IndividualTrackingItemDto[]> {
    try {
      const assessment = await this.assessmentRepo.findOne({
        where: { id: context.assessmentId },
        relations: ['class'],
      });
      if (!assessment) throw new NotFoundException('Assessment not found');
      if (!assessment.isPublic) throw new BadRequestException('Assessment is not published yet');

      const submissions = await this.submissionRepo.find({
        where: { assessment: { id: context.assessmentId } },
        relations: ['user', 'team', 'evaluation'],
      });

      if (assessment.submissionType === SubmissionType.TEAM) {
        const teams = await this.teamRepo.find({
          where: { class: { id: assessment.class.id } },
        });
        return teams.map((team) => {
          const sub = submissions.find((s) => s.team?.id === team.id);
          return {
            teamId: team.id,
            name: team.name,
            status: sub ? (sub.evaluation ? 'GRADED' : sub.status) : 'NOT_SUBMITTED',
            score: sub?.evaluation?.score || null,
          };
        });
      } else {
        const enrollments = await this.enrollmentRepo.find({
          where: { class: { id: assessment.class.id } },
          relations: ['user'],
        });
        return enrollments.map((enrollment) => {
          const sub = submissions.find((s) => s.user?.id === enrollment.user.id);
          return {
            studentId: enrollment.user.id,
            name: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
            status: sub ? (sub.evaluation ? 'GRADED' : sub.status) : 'NOT_SUBMITTED',
            score: sub?.evaluation?.score || null,
          };
        });
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to get tracking');
    }
  }

  async findAllByClass(context: ClassContext): Promise<AssessmentListItemDto[]> {
    try {
      if (!context?.classId) throw new NotFoundException('Class context not available');
      const whereCondition =
        context.role === UserRole.Teacher || context.role === UserRole.TeacherAssistant
          ? { class: { id: context.classId } }
          : { class: { id: context.classId }, isPublic: true };

      return await this.assessmentRepo.find({
        where: whereCondition,
        order: { dueDate: 'ASC' },
        relations: ['resources', 'resources.resource'],
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new BadRequestException('Failed to get assessments for class');
    }
  }

  async findAllByClassSession(sessionId: number, context: ClassContext): Promise<AssessmentListItemDto[]> {
    try {
      if (!context?.classId) throw new NotFoundException('Class context not available');
      const whereCondition =
        context.role === UserRole.Teacher || context.role === UserRole.TeacherAssistant
          ? { class: { id: context.classId }, session: sessionId }
          : { class: { id: context.classId }, session: sessionId, isPublic: true };
      return await this.assessmentRepo.find({
        where: whereCondition,
        order: { dueDate: 'ASC' },
        relations: ['resources', 'resources.resource'],
      });
    } catch (err) {
      throw new BadRequestException('Failed to get assessments for class session');
    }
  }

  async findOne(context: AssessmentContext): Promise<AssessmentDetailDto> {

    const assessment = await this.assessmentRepo.findOne({
      where: { id: context.assessmentId },
      relations: ['resources', 'resources.resource', 'rubrics'],
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async deleteAssessment(context: AssessmentContext): Promise<DeleteAssessmentResponseDto> {
    if (!context || !context.assessmentEntity) {
      throw new NotFoundException('Assessment context not available');
    }

    return await this.assessmentRepo.remove(context.assessmentEntity);
  }
  async isAssessmentAccessibleByUser(assessmentId: number, userId: number): Promise<boolean> { 
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
      relations: ['class', 'class.enrollments', 'class.enrollments.user'],
    });
    if (!assessment) return false;
    const isEnrolled = assessment.class.enrollments.some(enrollment => enrollment.user.id === userId);
    return isEnrolled;    
  }
}