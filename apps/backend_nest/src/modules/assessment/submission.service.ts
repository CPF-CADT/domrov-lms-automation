import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { Assessment } from '../../libs/entities/assessment/assessment.entity';
import { Submission } from '../../libs/entities/assessment/submission.entity';
import { Resource } from '../../libs/entities/resource/resource.entity';
import { Team } from '../../libs/entities/classroom/team.entity';
import { Enrollment } from '../../libs/entities/classroom/enrollment.entity';
import { SubmissionResource } from '../../libs/entities/resource/submission-resource.entity';
import { Evaluation } from '../../libs/entities/assessment/evaluation.entity';
import { EvaluationFeedback } from '../../libs/entities/assessment/evaluation-feedback.entity';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';

// Context
import { SubmissionContext } from '../../common/security/dtos/guard.dto';

// Enums & DTOs
import { SubmissionStatus } from '../../libs/enums/Status';
import { ResourceType } from '../../libs/enums/Resource';
import { GradeSubmissionDTO } from '../../libs/dtos/submission/grade-submission.dto';
import {
  AIModelSelectionMode,
  EvaluationType,
  SubmissionMethod,
  SubmissionType,
} from '../../libs/enums/Assessment';
import { SubmitAssignmentDto } from '../../libs/dtos/submission/submit-assignment.dto';
import { FeedbackItemDto } from '../../libs/dtos/submission/feedback-item.dto';
import { EvaluationService } from '../evaluation/evaluation.service';
import { Encryption } from '../../libs/utils/Encryption';
import { WalletService } from '../wallet/wallet.service';
import { RubricCriterion } from '../../libs/interfaces/submission';
import {
  SubmitAssignmentResponseDto,
  ApproveSubmissionResponseDto,
  EvaluationResponseDto,
  SubmissionViewerResponseDto,
  MySubmissionResponseDto,
  SubmissionStatusItemDto,
  TeamRosterItemDto,
  IndividualRosterItemDto,
  AssessmentStatsResponseDto,
  AddFeedbackResponseDto,
  UpdateFeedbackResponseDto,
  SubmissionResourceUrlResponseDto,
} from '../../libs/dtos/submission/submission-response.dto';
import { TeamAssessment } from '../../libs/entities/classroom/team-assessment.entity';
import { NotificationService } from '../../services/notification.service';
import { NotificationType } from '../../libs/entities/user/notification.entity';
import { ConfigService } from '@nestjs/config';
// import { Notification } from '../../libs/entities/user/notification.entity';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
    @InjectRepository(SubmissionResource)
    private subResourceRepo: Repository<SubmissionResource>,
    @InjectRepository(Evaluation)
    private evaluationRepo: Repository<Evaluation>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,

    @InjectRepository(TeamAssessment)
    private teamAssessmentRepo: Repository<TeamAssessment>,

    @InjectRepository(EvaluationFeedback)
    private readonly evaluationFeedbackRepo: Repository<EvaluationFeedback>,

    @InjectRepository(UserAIKey)
    private readonly userAIKeyRepo: Repository<UserAIKey>,
    private notificationService: NotificationService,
    private walletService: WalletService,
    private readonly aiEvaluationService: EvaluationService,
    private readonly config: ConfigService
  ) {}

  async createSubmissionsForAssessment(assessment: Assessment) {
    try {
      const assessmentData = await this.assessmentRepo.findOne({
        select: ['id'],
        where: { id: assessment.id },
        relations: ['class'], // only class to get class.id
      });
      if (!assessmentData) throw new NotFoundException('Assessment not found');

      if (assessment.submissionType === SubmissionType.INDIVIDUAL) {
        const enrollments = await this.enrollmentRepo
          .createQueryBuilder('enrollment')
          .leftJoinAndSelect('enrollment.user', 'user')
          .where('enrollment.classId = :classId', {
            classId: assessmentData.class.id,
          })
          .getMany();
        const submissions: Submission[] = enrollments
          .filter((e): e is Enrollment & { user: any } => !!e.user)
          .map((e) => {
            const submission: Submission = {
              assessment,
              user: e.user,
              status: SubmissionStatus.PENDING,
              attemptNumber: 0,
            } as any;
            return submission;
          });

        if (submissions.length > 0) {
          await this.submissionRepo.save(submissions);
        } else {
          throw new BadRequestException(
            'No submissions to save for individual assessment',
          );
        }
      } else if (assessment.submissionType === SubmissionType.TEAM) {
        const teamAssessments = await this.teamAssessmentRepo
          .createQueryBuilder('ta')
          .leftJoinAndSelect('ta.team', 'team')
          .where('ta.assessmentId = :assessmentId', {
            assessmentId: assessment.id,
          })
          .getMany();
        const submissions: Submission[] = teamAssessments
          .filter((ta): ta is TeamAssessment & { team: any } => !!ta.team)
          .map((ta) => {
            const submission: Submission = {
              assessment,
              team: ta.team,
              status: SubmissionStatus.PENDING,
              attemptNumber: 0,
            } as any;
            return submission;
          });

        if (submissions.length > 0) {
          await this.submissionRepo.save(submissions);
        } else {
        }
      }
    } catch (err) {
      throw new BadRequestException(
        'Failed to create submissions for assessment',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  // Save or update draft assignment (PATCH)
  async saveDraftAssignment(
    userId: number,
    assessmentId: number,
    dto: SubmitAssignmentDto,
  ): Promise<SubmitAssignmentResponseDto> {
    try {
      const assessmentMeta = await this.assessmentRepo.findOne({
        where: { id: assessmentId },
        relations: [
          'class',
          'class.enrollments',
          'class.enrollments.user',
          'teamAssessments',
          'teamAssessments.team',
          'teamAssessments.team.members',
          'teamAssessments.team.members.user',
        ],
      });

      if (!assessmentMeta) throw new NotFoundException('Assessment not found');

      const isEnrolled = assessmentMeta.class.enrollments.some(
        (e) => e.user.id === userId,
      );

      if (!isEnrolled) throw new ForbiddenException('Not enrolled in class');

      let submission: Submission;

      let team: Team | undefined;

      if (assessmentMeta.submissionType === SubmissionType.TEAM) {
        const teamAssessment = assessmentMeta.teamAssessments.find((ta) =>
          ta.team.members.some((m) => m.user.id === userId),
        );
        if (!teamAssessment)
          throw new BadRequestException(
            'Team assignment but you are not in an allowed team for this assessment',
          );
        team = teamAssessment.team;
        if (team.members.length > team.maxMember)
          throw new BadRequestException('Team exceeds maximum members');
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, team: { id: team.id } },
          relations: ['resources', 'resources.resource'],
        });
        if (!submission) {
          submission = this.submissionRepo.create({
            assessment: assessmentMeta,
            team,
            status: SubmissionStatus.PENDING,
            attemptNumber: 1,
            submissionTime: null,
          });
        }
      } else {
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, user: { id: userId } },
          relations: ['resources', 'resources.resource'],
        });
        if (!submission) {
          submission = this.submissionRepo.create({
            assessment: assessmentMeta,
            user: { id: userId },
            status: SubmissionStatus.PENDING,
            attemptNumber: 1,
            submissionTime: null,
          });
        }
      }
      if (!submission) throw new NotFoundException('Submission not found');
      if (submission.status === SubmissionStatus.GRADED)
        throw new BadRequestException('Cannot edit after grading');
      if (dto.comments) submission.comments = dto.comments;
      if (submission.id) {
        await this.subResourceRepo.delete({
          submission: { id: submission.id },
        });
      }
      if (dto.resources?.length) {
        for (const resDto of dto.resources) {
          const resource = await this.resourceRepo.findOne({
            where: { id: resDto.resourceId },
          });
          if (!resource)
            throw new BadRequestException(
              `Resource ${resDto.resourceId} not found`,
            );
          if (
            assessmentMeta.allowedSubmissionMethod ===
              SubmissionMethod.GITHUB &&
            resource.type !== ResourceType.URL
          ) {
            throw new BadRequestException(
              `Resource ${resDto.resourceId} must be a GitHub URL`,
            );
          }
          const subRes = this.subResourceRepo.create({ submission, resource });
          await this.subResourceRepo.save(subRes);
        }
      }
      if (dto.githubUrl) {
        const resource = await this.resourceRepo.save({
          title: `GitHub: ${assessmentMeta.title}`,
          type: ResourceType.URL,
          url: dto.githubUrl,
          owner: `${userId}`,
        });
        await this.subResourceRepo.save({ submission, resource });
      }

      if (
        this.evaluationRepo.findOne({
          where: { submission: { id: submission.id } },
        })
      ) {
        throw new BadRequestException('Cannot edit after evaluation');
      }

      submission.status = SubmissionStatus.PENDING;
      await this.submissionRepo.save(submission);
      return { message: 'Draft saved', submissionId: submission.id };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException
      ) {
        throw err; // let test-expected errors bubble
      }
      throw new BadRequestException('Failed to save draft assignment');
    }
  }

  // Final submit (POST): change state only, trigger queue, prevent duplicate
  async submitAssignment(
    userId: number,
    assessmentId: number,
  ): Promise<SubmitAssignmentResponseDto> {
    try {
      const assessmentMeta = await this.assessmentRepo.findOne({
        where: { id: assessmentId },
        relations: [
          'class',
          'class.enrollments',
          'class.enrollments.user',
          'teamAssessments',
          'teamAssessments.team',
          'teamAssessments.team.members',
          'teamAssessments.team.members.user',
        ],
      });
      if (!assessmentMeta) throw new NotFoundException('Assessment not found');
      const isEnrolled = assessmentMeta.class.enrollments.some(
        (e) => e.user.id === userId,
      );
      if (!isEnrolled) throw new ForbiddenException('Not enrolled in class');
      let submission: Submission;
      let team: Team | undefined;
      if (assessmentMeta.submissionType === SubmissionType.TEAM) {
        const teamAssessment = assessmentMeta.teamAssessments.find((ta) =>
          ta.team.members.some((m) => m.user.id === userId),
        );
        if (!teamAssessment)
          throw new BadRequestException(
            'Team assignment but you are not in an allowed team for this assessment',
          );
        team = teamAssessment.team;
        if (team.members.length > team.maxMember)
          throw new BadRequestException('Team exceeds maximum members');
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, team: { id: team.id } },
        });
      } else {
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, user: { id: userId } },
        });
      }
      if (!submission)
        throw new BadRequestException('No draft found to submit');
      if (
        submission.status === SubmissionStatus.SUBMITTED ||
        submission.status === SubmissionStatus.RESUBMITTED ||
        submission.status === SubmissionStatus.LATE
      ) {
        throw new BadRequestException('Already submitted');
      }
      submission.attemptNumber = (submission.attemptNumber || 0) + 1;
      submission.submissionTime = new Date();
      const now = new Date();
      if (now > assessmentMeta.dueDate) {
        submission.status = assessmentMeta.allowLate
          ? SubmissionStatus.LATE
          : SubmissionStatus.SUBMITTED;
      } else {
        submission.status =
          submission.status === SubmissionStatus.PENDING
            ? SubmissionStatus.SUBMITTED
            : SubmissionStatus.RESUBMITTED;
      }
      await this.submissionRepo.save(submission);

      const student = submission.user;
      if (student) {
        const submissionText =
          submission.status === SubmissionStatus.LATE
            ? 'submitted late'
            : 'submitted successfully';

        await this.notificationService.notifyStudent(student, {
          title: 'Assignment Submitted',
          message: `Your assignment "${submission.assessment.title}" has been ${submissionText}.`,
          actionUrl: `${this.config.get<String>("BASE_URL")}/${assessmentId}/submission/${submission.id}`,
          type: NotificationType.ALERT,
        });
      }
      if (assessmentMeta.aiEvaluationEnable) {
        this.aiEvaluationService.addTaskToQueue(submission.id.toString());
      }

      return { message: 'Submitted successfully', submissionId: submission.id };
    } catch (err) {
      throw new BadRequestException('Failed to submit assignment');
    }
  }

  // Unsubmit (POST): revert to draft if allowed
  async unsubmitAssignment(
    userId: number,
    assessmentId: number,
  ): Promise<SubmitAssignmentResponseDto> {
    try {
      const assessmentMeta = await this.assessmentRepo.findOne({
        where: { id: assessmentId },
        relations: [
          'class',
          'class.enrollments',
          'class.enrollments.user',
          'teamAssessments',
          'teamAssessments.team',
          'teamAssessments.team.members',
          'teamAssessments.team.members.user',
        ],
      });
      if (!assessmentMeta) throw new NotFoundException('Assessment not found');
      const isEnrolled = assessmentMeta.class.enrollments.some(
        (e) => e.user.id === userId,
      );
      if (!isEnrolled) throw new ForbiddenException('Not enrolled in class');
      let submission: Submission;
      let team: Team | undefined;
      if (assessmentMeta.submissionType === SubmissionType.TEAM) {
        const teamAssessment = assessmentMeta.teamAssessments.find((ta) =>
          ta.team.members.some((m) => m.user.id === userId),
        );
        if (!teamAssessment)
          throw new BadRequestException(
            'Team assignment but you are not in an allowed team for this assessment',
          );
        team = teamAssessment.team;
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, team: { id: team.id } },
        });
      } else {
        submission = await this.submissionRepo.findOne({
          where: { assessment: { id: assessmentId }, user: { id: userId } },
        });
      }
      if (!submission) throw new BadRequestException('No submission found');
      if (submission.status === SubmissionStatus.GRADED) {
        throw new BadRequestException('Cannot unsubmit a graded submission');
      }
      submission.status = SubmissionStatus.PENDING;
      await this.submissionRepo.save(submission);
      return {
        message: 'Submission reverted to draft',
        submissionId: submission.id,
      };
    } catch (err) {
      throw new BadRequestException('Failed to unsubmit assignment');
    }
  }

  async gradeSubmission(
    context: SubmissionContext,
    dto: GradeSubmissionDTO,
  ): Promise<EvaluationResponseDto> {
    const submission = context.submissionEntity;

    let evaluation = submission.evaluation;
    if (!evaluation) {
      evaluation = this.evaluationRepo.create({
        submission,
      });
    }

    evaluation.evaluationType = EvaluationType.MANUAL;

    evaluation.score = dto.score;
    evaluation.feedback = dto.feedback;
    await this.evaluationRepo.save(evaluation);

    submission.status = SubmissionStatus.GRADED;
    await this.submissionRepo.save(submission);
    const student = submission.user;
    if (student) {
      await this.notificationService.notifyStudent(student, {
        title: 'Assignment Graded',
        message: `Your submission for "${submission.assessment.title}" has been graded. Score: ${dto.score}/${submission.assessment.maxScore}`,
        actionUrl: `http://localhost:3000/assessments/${submission.assessment.id}/submission/${submission.id}`,
        type: NotificationType.ALERT,
      });
    }

    return evaluation;
  }

  async approveSubmission(
    context: SubmissionContext,
  ): Promise<ApproveSubmissionResponseDto> {
    const submission = context.submissionEntity;

    if (!submission.evaluation) {
      throw new BadRequestException('Submission has no evaluation yet');
    }

    submission.evaluation.isApproved = true;
    await this.evaluationRepo.save(submission.evaluation);
    // NEW: Notify student that grade is now visible
    const student = submission.user;
    if (student) {
      await this.notificationService.notifyStudent(student, {
        title: 'Grade Published',
        message: `Your grade for "${submission.assessment.title}" is now available to view.`,
        actionUrl: `http://localhost:3000/assessments/${submission.assessment.id}/submission/${submission.id}`,
        type: NotificationType.ALERT,
      });
    }

    return {
      message: 'Submission approved successfully',
      submissionId: submission.id,
      evaluationId: submission.evaluation.id,
      isApproved: submission.evaluation.isApproved,
    };
  }

  async getSubmissionForViewer(
    context: SubmissionContext,
  ): Promise<SubmissionViewerResponseDto> {
    const submission = context.submissionEntity;

    return {
      id: submission.id,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      submissionTime: submission.submissionTime,
      status: submission.status,
      attemptNumber: submission.attemptNumber,
      user: submission.user
        ? {
            id: submission.user.id,
            firstName: submission.user.firstName,
            lastName: submission.user.lastName,
          }
        : null,
      team: submission.team
        ? {
            id: submission.team.id,
            name: submission.team.name,
            maxMember: submission.team.maxMember,
            members: submission.team.members.map((m) => ({
              id: m.id,
              user: m.user
                ? {
                    id: m.user.id,
                    firstName: m.user.firstName,
                    lastName: m.user.lastName,
                  }
                : null,
            })),
          }
        : null,
      assessment: submission.assessment
        ? {
            id: submission.assessment.id,
            title: submission.assessment.title,
            maxScore: submission.assessment.maxScore,
            class: submission.assessment.class
              ? {
                  id: submission.assessment.class.id,
                  name: submission.assessment.class.name,
                }
              : null,
          }
        : null,
      evaluation: submission.evaluation ?? null,
      resources: submission.resources.map((r) => ({
        id: r.id,
        resource: r.resource
          ? {
              id: r.resource.id,
              title: r.resource.title,
              type: r.resource.type,
              url: r.resource.url,
            }
          : null,
      })),
    };
  }

  async getMySubmission(
    userId: number,
    assessmentId: number,
  ): Promise<MySubmissionResponseDto> {
    const assessmentWithTeams = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
      relations: [
        'class',
        'class.enrollments',
        'class.enrollments.user',
        'teamAssessments',
        'teamAssessments.team',
        'teamAssessments.team.members',
        'teamAssessments.team.members.user',
        'submissions',
        'submissions.resources',
        'submissions.resources.resource',
        'submissions.evaluation',
      ],
    });

    if (!assessmentWithTeams)
      throw new NotFoundException('Assessment not found');
    if (!assessmentWithTeams.isPublic)
      throw new BadRequestException('Assessment not found');

    let submission: Submission | null = null;

    if (assessmentWithTeams.submissionType === SubmissionType.TEAM) {
      const teamAssessment = assessmentWithTeams.teamAssessments.find((ta) =>
        ta.team.members.some((m) => m.user.id === userId),
      );

      if (!teamAssessment) {
        return {
          status: SubmissionStatus.PENDING,
          message: 'Not in an allowed team for this assessment',
          resources: [],
          evaluation: null,
        };
      }

      submission = await this.submissionRepo.findOne({
        where: {
          assessment: { id: assessmentId },
          team: { id: teamAssessment.team.id },
        },
        relations: ['resources', 'resources.resource', 'evaluation'],
      });
    } else {
      submission = await this.submissionRepo.findOne({
        where: { assessment: { id: assessmentId }, user: { id: userId } },
        relations: ['resources', 'resources.resource', 'evaluation'],
      });
    }

    if (!submission) {
      return {
        status: SubmissionStatus.PENDING,
        resources: [],
        evaluation: null,
      };
    }

    const evaluationData =
      submission.evaluation && (submission?.evaluation?.isApproved ?? false)
        ? {
            id: submission.evaluation.id,
            score: submission.evaluation.score,
            feedback: submission.evaluation.feedback || null,
            aiFeedback: submission.evaluation.aiOutput,
            isApproved: true,
          }
        : null;

    return {
      id: submission.id,
      status: submission.status,
      attemptNumber: submission.attemptNumber,
      submissionTime: submission.submissionTime,
      comments: submission.comments || null,
      resources:
        submission.resources?.map((r) => ({
          id: r.resource.id,
          title: r.resource.title,
          type: r.resource.type,
          url: r.resource.url || null,
        })) || [],
      evaluation: evaluationData,
    };
  }

  async getMySubmissionsStatus(
    userId: number,
    classId: number,
  ): Promise<SubmissionStatusItemDto[]> {
    const assessments = await this.assessmentRepo.find({
      where: { class: { id: classId } },
    });
    const submissions = await this.submissionRepo.find({
      where: { user: { id: userId }, assessment: { class: { id: classId } } },
      relations: ['evaluation', 'assessment'],
    });

    if (submissions.length == 0) return [];

    return assessments.map((assessment) => {
      if (!assessment.isPublic)
        throw new BadRequestException('Assessment not found');

      const submission = submissions.find(
        (s) =>
          s.assessment.id === assessment.id &&
          (s?.evaluation?.isApproved ?? false),
      );

      return {
        assessmentId: assessment.id,
        title: assessment.title,
        dueDate: assessment.dueDate,
        status: submission ? submission.status : 'PENDING',
        submissionId: submission?.id || null,
        grade: submission?.evaluation?.score || null,
      };
    });
  }

  async getAssignmentRoster(
    assessmentId: number,
  ): Promise<TeamRosterItemDto[] | IndividualRosterItemDto[]> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
      relations: ['class'],
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (!assessment.isPublic)
      throw new BadRequestException('Assessment not found');

    const submissions = await this.submissionRepo.find({
      where: { assessment: { id: assessmentId } },
      relations: ['user', 'team', 'evaluation'],
    });

    if (assessment.submissionType == SubmissionType.TEAM) {
      const teams = await this.teamRepo.find({
        where: { class: { id: assessment.class.id } },
        relations: ['members', 'members.user'],
      });

      return teams.map((team) => {
        const sub = submissions.find((s) => s.team?.id === team.id);
        return {
          type: 'TEAM',
          id: team.id,
          name: team.name,
          members: team.members.map((m) => ({
            userId: m.user.id,
            fullName: `${m.user.firstName} ${m.user.lastName}`,
            profileUrl: m.user.profilePictureUrl,
          })),
          status: sub ? sub.status : 'NOT_SUBMITTED',
          submissionId: sub?.id || null,
          score: sub?.evaluation?.score || null,
          submittedAt: sub?.submissionTime || null,
        };
      });
    } else {
      const enrollments = await this.enrollmentRepo.find({
        where: { class: { id: assessment.class.id } },
        relations: ['user'],
      });

      return enrollments.map((enrollment) => {
        const student = enrollment.user;
        const sub = submissions.find((s) => s.user?.id === student.id);
        return {
          type: 'INDIVIDUAL',
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          profileUrl: student.profilePictureUrl,
          status: sub ? sub.status : 'NOT_SUBMITTED',
          submissionId: sub?.id || null,
          score: sub?.evaluation?.score || null,
          submittedAt: sub?.submissionTime || null,
        };
      });
    }
  }

  async getAssessmentStats(
    assessmentId: number,
  ): Promise<AssessmentStatsResponseDto> {
    const roster = await this.getAssignmentRoster(assessmentId);
    const total = roster.length;
    const submitted = roster.filter((r) => r.status !== 'NOT_SUBMITTED').length;
    const graded = roster.filter(
      (r) => r.status === 'GRADED' || r.status === 'EVALUATED',
    ).length;

    return {
      totalStudentsOrTeams: total,
      submittedCount: submitted,
      pendingCount: total - submitted,
      gradedCount: graded,
    };
  }

  async evaluateSubmission(
    submissionId: number,
    totalScore: number,
    feedback: string,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    let evaluation = await this.evaluationRepo.findOne({
      where: { submission: { id: submissionId } },
    });
    if (!evaluation) {
      evaluation = this.evaluationRepo.create({
        submission,
        score: totalScore,
        feedback,
        evaluationType: EvaluationType.MANUAL,
      });
    } else {
      evaluation.score = totalScore;
      evaluation.feedback = feedback;
    }
    await this.evaluationRepo.save(evaluation);
    return evaluation;
  }

  async addFeedbackLineByLine(
    context: SubmissionContext,
    dto: FeedbackItemDto,
  ): Promise<AddFeedbackResponseDto> {
    const submission = context.submissionEntity;
    let evaluation = await this.evaluationRepo.findOne({
      where: { submission: { id: submission.id } },
    });

    if (!evaluation) {
      evaluation = this.evaluationRepo.create({
        submission,
        score: 0,
        feedback: '',
        evaluationType: EvaluationType.AI,
      });
      await this.evaluationRepo.save(evaluation);
    }

    if (dto && dto.path) {
      const feedbackEntity = this.evaluationFeedbackRepo.create({
        evaluation,
        filePath: dto.path,
        startLine: dto.startLine,
        endLine: dto.endLine,
        message: dto.message,
        feedbackType: dto.type,
      });
      await this.evaluationFeedbackRepo.save(feedbackEntity);
    }

    return {
      message: 'Feedback item added successfully',
      evaluationId: evaluation.id,
      addedItemsCount: dto ? 1 : 0,
    };
  }

  async updateSingleFeedback(
    userId: number,
    feedbackId: string,
    dto: FeedbackItemDto,
  ): Promise<UpdateFeedbackResponseDto> {
    const feedback = await this.evaluationFeedbackRepo.findOne({
      where: { id: feedbackId },
      relations: [
        'evaluation',
        'evaluation.submission',
        'evaluation.submission.assessment',
        'evaluation.submission.assessment.class',
        'evaluation.submission.assessment.class.owner',
      ],
    });

    if (!feedback) throw new NotFoundException('Feedback item not found');
    if (feedback.evaluation.submission.assessment.class.owner.id !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this feedback',
      );
    }

    feedback.filePath = dto.path;
    feedback.startLine = dto.startLine;
    feedback.endLine = dto.endLine;
    feedback.message = dto.message;
    feedback.feedbackType = dto.type;

    await this.evaluationFeedbackRepo.save(feedback);
    return {
      message: 'Feedback item updated successfully',
      feedbackId: feedback.id,
    };
  }

  async getSubmissionDetails(submissionId: number) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: [
        'assessment',
        'assessment.rubrics',
        'resources',
        'resources.resource',
        'assessment.class',
        'assessment.class.owner',
        'evaluation',
      ],
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.evaluation)
      throw new BadRequestException('Submission already evaluated');

    const assessment = submission.assessment;
    if (!assessment.aiEvaluationEnable)
      throw new NotFoundException('Submission not found');

    const R2_KEY = `${submission.userId}/submission/${submission.id}`;
    let resourceUrl: string | null = null;
    if (
      assessment.allowedSubmissionMethod === SubmissionMethod.ANY ||
      assessment.allowedSubmissionMethod == SubmissionMethod.ZIP
    ) {
      const githubRes = submission.resources?.find(
        (sr) =>
          sr.resource.type === ResourceType.URL &&
          sr.resource.url.includes('github.com'),
      );
      resourceUrl = githubRes ? githubRes.resource.url : R2_KEY;
    } else if (assessment.allowedSubmissionMethod === SubmissionMethod.GITHUB) {
      const githubRes = submission.resources?.find((sr) =>
        sr.resource.url.includes('github.com'),
      );
      resourceUrl = githubRes ? githubRes.resource.url : null;
    }

    const rubric = assessment.rubrics.map((r) => ({
      criterion: r.definition,
      weight: r.totalScore,
    })) as RubricCriterion[];

    if (assessment.aiModelSelectionMode === AIModelSelectionMode.SYSTEM) {
      const balance = await this.walletService.getBalance(
        submission.assessment.class.owner.id,
      );
      if (balance < 0) throw new BadRequestException('Insufficient Balance');
      return {
        submission_id: submission.id.toString(),
        instructions: assessment.instruction,
        resource_url: resourceUrl,
        user_exclude_files: assessment.user_exclude_files,
        user_include_files: assessment.user_include_files,
        rubric,
        ai: {
          provider: 'domrov',
          api_key: 'nothing',
          api_endpoint: 'domrov.edu',
          model: 'domrov',
          label: 'domrov',
        },
      };
    } else if (assessment.aiModelSelectionMode === AIModelSelectionMode.USER) {
      const userKey = await this.userAIKeyRepo.findOne({
        where: {
          userId: submission.assessment.class.owner.id,
          isActive: true,
          isValid: true,
        },
        order: { created_at: 'DESC' },
      });

      if (!userKey) throw new NotFoundException('User Key invalid');
      console.log(assessment.user_include_files.length);
      console.log(assessment.user_exclude_files.length);
      const decryptedKey = Encryption.decryptKey(userKey.encryptedKey);
      return {
        submission_id: submission.id.toString(),
        instructions: assessment.instruction,
        resource_url: resourceUrl,
        user_exclude_files: assessment.user_exclude_files,
        user_include_files: assessment.user_include_files,
        rubric,
        ai: {
          provider: userKey.provider,
          api_key: decryptedKey,
          api_endpoint: userKey.apiEndpoint,
          model: userKey.model,
          label: userKey.label,
        },
      };
    }
    throw new NotFoundException('Submission not found');
  }

  async getSubmissionResoucrs(
    submissionId: number,
  ): Promise<SubmissionResourceUrlResponseDto> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: [
        'resources',
        'resources.resource',
        'assessment.class',
        'assessment.class.owner',
      ],
    });

    if (!submission) throw new NotFoundException('Submission not found');

    const assessment = submission.assessment;
    const R2_KEY = `${submission.userId}/submission/${submission.id}`;
    let resourceUrl: string | null = null;

    if (
      assessment.allowedSubmissionMethod === SubmissionMethod.ANY ||
      assessment.allowedSubmissionMethod == SubmissionMethod.ZIP
    ) {
      const githubRes = submission.resources?.find(
        (sr) =>
          sr.resource.type === ResourceType.URL &&
          sr.resource.url.includes('github.com'),
      );
      resourceUrl = githubRes ? githubRes.resource.url : R2_KEY;
    } else if (assessment.allowedSubmissionMethod === SubmissionMethod.GITHUB) {
      const githubRes = submission.resources?.find((sr) =>
        sr.resource.url.includes('github.com'),
      );
      resourceUrl = githubRes ? githubRes.resource.url : null;
    }

    return { resource_url: resourceUrl };
  }

  async getSubmissionForTeacher(
    context: SubmissionContext,
  ): Promise<SubmissionViewerResponseDto> {
    const submission = context.submissionEntity;

    return {
      id: submission.id,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      submissionTime: submission.submissionTime,
      status: submission.status,
      attemptNumber: submission.attemptNumber,

      user: submission.user
        ? {
            id: submission.user.id,
            firstName: submission.user.firstName,
            lastName: submission.user.lastName,
          }
        : null,

      team: submission.team
        ? {
            id: submission.team.id,
            name: submission.team.name,
            maxMember: submission.team.maxMember,
            members: submission.team.members.map((m) => ({
              id: m.id,
              user: m.user
                ? {
                    id: m.user.id,
                    firstName: m.user.firstName,
                    lastName: m.user.lastName,
                  }
                : null,
            })),
          }
        : null,

      assessment: submission.assessment
        ? {
            id: submission.assessment.id,
            title: submission.assessment.title,
            maxScore: submission.assessment.maxScore,
            class: submission.assessment.class
              ? {
                  id: submission.assessment.class.id,
                  name: submission.assessment.class.name,
                }
              : null,
          }
        : null,

      // 🔓 Teacher sees evaluation always
      evaluation: submission.evaluation ?? null,

      resources: submission.resources.map((r) => ({
        id: r.id,
        resource: r.resource
          ? {
              id: r.resource.id,
              title: r.resource.title,
              type: r.resource.type,
              url: r.resource.url,
            }
          : null,
      })),
    };
  }

  async getSubmissionForStudent(
    context: SubmissionContext,
  ): Promise<SubmissionViewerResponseDto> {
    const submission = context.submissionEntity;

    let evaluationData = null;

    if (submission.evaluation && submission.evaluation.isApproved) {
      evaluationData = submission.evaluation;
    }

    return {
      id: submission.id,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      submissionTime: submission.submissionTime,
      status: submission.status,
      attemptNumber: submission.attemptNumber,

      user: submission.user
        ? {
            id: submission.user.id,
            firstName: submission.user.firstName,
            lastName: submission.user.lastName,
          }
        : null,

      team: submission.team
        ? {
            id: submission.team.id,
            name: submission.team.name,
            maxMember: submission.team.maxMember,
            members: submission.team.members.map((m) => ({
              id: m.id,
              user: m.user
                ? {
                    id: m.user.id,
                    firstName: m.user.firstName,
                    lastName: m.user.lastName,
                  }
                : null,
            })),
          }
        : null,

      assessment: submission.assessment
        ? {
            id: submission.assessment.id,
            title: submission.assessment.title,
            maxScore: submission.assessment.maxScore,
            class: submission.assessment.class
              ? {
                  id: submission.assessment.class.id,
                  name: submission.assessment.class.name,
                }
              : null,
          }
        : null,

      // 🔐 Student sees evaluation ONLY if approved
      evaluation: evaluationData,

      resources: submission.resources.map((r) => ({
        id: r.id,
        resource: r.resource
          ? {
              id: r.resource.id,
              title: r.resource.title,
              type: r.resource.type,
              url: r.resource.url,
            }
          : null,
      })),
    };
  }
}
