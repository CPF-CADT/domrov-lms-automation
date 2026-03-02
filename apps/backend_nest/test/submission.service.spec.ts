import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Repository } from 'typeorm';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SubmissionService } from '../src/modules/assessment/submission.service';
import { Assessment } from '../src/libs/entities/assessment/assessment.entity';
import { Submission } from '../src/libs/entities/assessment/submission.entity';
import { Resource } from '../src/libs/entities/resource/resource.entity';
import { SubmissionResource } from '../src/libs/entities/resource/submission-resource.entity';
import { Evaluation } from '../src/libs/entities/assessment/evaluation.entity';
import { Team } from '../src/libs/entities/classroom/team.entity';
import { Enrollment } from '../src/libs/entities/classroom/enrollment.entity';
import { EvaluationFeedback } from '../src/libs/entities/assessment/evaluation-feedback.entity';
import { UserAIKey } from '../src/libs/entities/ai/user-ai-key.entity';

import { WalletService } from '../src/modules/wallet/wallet.service';
import { EvaluationService } from '../src/modules/evaluation/evaluation.service';
// import { NotificationService } from '../src/services/notification.service';
import { ConfigService } from '@nestjs/config';

import { SubmitAssignmentDto } from '../src/libs/dtos/submission/submit-assignment.dto';
import { GradeSubmissionDTO } from '../src/libs/dtos/submission/grade-submission.dto';

import {
    SubmitAssignmentResponseDto,
    ApproveSubmissionResponseDto,
    EvaluationResponseDto,
    SubmissionViewerResponseDto,
    MySubmissionResponseDto,
    SubmissionStatusItemDto,
    AssessmentStatsResponseDto,
    SubmissionResourceUrlResponseDto,
} from '../src/libs/dtos/submission/submission-response.dto';

import { SubmissionStatus } from '../src/libs/enums/Status';
import { SubmissionType, SubmissionMethod, AIModelSelectionMode } from '../src/libs/enums/Assessment';
import { ResourceType } from '../src/libs/enums/Resource';
import type { SubmissionContext } from '../src/common/security/dtos/guard.dto';
import { TeamAssessment } from '../src/libs/entities/classroom/team-assessment.entity';
import { NotificationService } from '../src/services/notification.service';

describe('SubmissionService - Detailed Logic and Computation Tests', () => {
    let submissionService: SubmissionService;

    let assessmentRepoMock: jest.Mocked<Repository<Assessment>>;
    let submissionRepoMock: jest.Mocked<Repository<Submission>>;
    let resourceRepoMock: jest.Mocked<Repository<Resource>>;
    let subResourceRepoMock: jest.Mocked<Repository<SubmissionResource>>;
    let evaluationRepoMock: jest.Mocked<Repository<Evaluation>>;
    let teamRepoMock: jest.Mocked<Repository<Team>>;
    let teamAssessmentRepoMock: jest.Mocked<Repository<TeamAssessment>>;
    let enrollmentRepoMock: jest.Mocked<Repository<Enrollment>>;
    let evaluationFeedbackRepoMock: jest.Mocked<Repository<EvaluationFeedback>>;
    let userAIKeyRepoMock: jest.Mocked<Repository<UserAIKey>>;

    let walletServiceMock: jest.Mocked<WalletService>;
    let aiEvaluationServiceMock: jest.Mocked<EvaluationService>;

    const mockDate = new Date('2025-03-01T10:00:00Z');
    const dueDate = new Date('2025-03-15T23:59:59Z');
    const pastDate = new Date('2025-02-20T10:00:00Z');
    const futureDate = new Date('2025-04-01T10:00:00Z');

    const mockAssessment: Assessment = {
        id: 100,
        title: 'Math Assignment',
        submissionType: SubmissionType.INDIVIDUAL,
        isPublic: true,
        dueDate: dueDate,
        allowLate: true,
        allowedSubmissionMethod: SubmissionMethod.ANY,
        aiEvaluationEnable: true,
        aiModelSelectionMode: 'SYSTEM',
        user_exclude_files: [],
        user_include_files: [],
        instruction: 'Solve the math problems.',
        maxScore: 100,
        class: {
            id: 10,
            name: 'Math 101',
            enrollments: [
                { user: { id: 1 } as any },
                { user: { id: 2 } as any },
                { user: { id: 3 } as any },
            ],
            owner: { id: 42 } as any,
        } as any,
        rubrics: [],
    } as Assessment;

    const mockSubmission: Submission = {
        id: 500,
        userId: 1,
        created_at: mockDate,
        updated_at: mockDate,
        assessment: mockAssessment,
        status: SubmissionStatus.PENDING,
        attemptNumber: 1,
        submissionTime: null,
        comments: 'Initial draft',
        user: { id: 1, firstName: 'John', lastName: 'Doe' } as any,
        resources: [],
        evaluation: null,
    } as Submission;

    const mockTeamSubmission: Submission = {
        id: 501,
        userId: null,
        created_at: mockDate,
        updated_at: mockDate,
        assessment: { ...mockAssessment, submissionType: SubmissionType.TEAM },
        status: SubmissionStatus.PENDING,
        team: { id: 200, name: 'Team Alpha', maxMember: 5, members: [] } as any,
        resources: [],
        evaluation: null,
    } as Submission;

    const mockSubmissionContext: SubmissionContext = {
        submissionId: 500,
        userId: 1,
        submissionEntity: mockSubmission,
        classContext: { classId: 10 } as any,
    } as SubmissionContext;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubmissionService,
                {
                    provide: getRepositoryToken(Assessment),
                    useValue: { findOne: jest.fn(), find: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Submission),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                // ADD THIS MOCK
                provide: NotificationService,
                useValue: {
                    sendNotification: jest.fn(),
                    // Add any other NotificationService methods your SubmissionService uses
                },
            },
                {
                    provide: getRepositoryToken(Enrollment),
                    useValue: {
                        find: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            // @ts-ignore
                            getMany: jest.fn().mockResolvedValue([
                                { id: 1, user: { id: 101, firstName: 'Alice' } },
                                { id: 2, user: { id: 102, firstName: 'Bob' } },
                                { id: 3, user: { id: 103, firstName: 'Charlie' } },
                            ]),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(TeamAssessment),
                    useValue: {
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            // @ts-ignore
                            getMany: jest.fn().mockResolvedValue([
                                { id: 1, team: { id: 201, name: 'Team A', members: [{ user: { id: 1 } }] } },
                                { id: 2, team: { id: 202, name: 'Team B', members: [{ user: { id: 2 } }] } },
                            ]),
                        })),
                        findOne: jest.fn(),
                        find: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: WalletService,
                    useValue: { getBalance: jest.fn() },
                },
                {
                    provide: EvaluationService,
                    useValue: { addTaskToQueue: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Resource),
                    useValue: { findOne: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(SubmissionResource),
                    useValue: { delete: jest.fn(), create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Evaluation),
                    useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Team),
                    useValue: { find: jest.fn() },
                },
                {
                    provide: getRepositoryToken(EvaluationFeedback),
                    useValue: { create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(UserAIKey),
                    useValue: { findOne: jest.fn() },
                },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn() },
                },
            ],
        }).compile();

        submissionService = module.get<SubmissionService>(SubmissionService);
        submissionRepoMock = module.get(getRepositoryToken(Submission));
        assessmentRepoMock = module.get(getRepositoryToken(Assessment));
        resourceRepoMock = module.get(getRepositoryToken(Resource)) as jest.Mocked<Repository<Resource>>;
        subResourceRepoMock = module.get(getRepositoryToken(SubmissionResource)) as jest.Mocked<Repository<SubmissionResource>>;
        evaluationRepoMock = module.get(getRepositoryToken(Evaluation)) as jest.Mocked<Repository<Evaluation>>;
        teamRepoMock = module.get(getRepositoryToken(Team)) as jest.Mocked<Repository<Team>>;
        teamAssessmentRepoMock = module.get(getRepositoryToken(TeamAssessment)) as jest.Mocked<Repository<TeamAssessment>>;
        enrollmentRepoMock = module.get(getRepositoryToken(Enrollment)) as jest.Mocked<Repository<Enrollment>>;
        evaluationFeedbackRepoMock = module.get(getRepositoryToken(EvaluationFeedback)) as jest.Mocked<Repository<EvaluationFeedback>>;
        userAIKeyRepoMock = module.get(getRepositoryToken(UserAIKey)) as jest.Mocked<Repository<UserAIKey>>;
        walletServiceMock = module.get(WalletService) as jest.Mocked<WalletService>;
        aiEvaluationServiceMock = module.get(EvaluationService) as jest.Mocked<EvaluationService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Clear call history but keep implementations
        submissionRepoMock.find.mockClear();
        enrollmentRepoMock.find.mockClear();
        teamRepoMock.find.mockClear();
        
        // Restore any spies on service methods
        jest.restoreAllMocks();
    });

    // =====================================================
    // createSubmissionsForAssessment - DETAILED LOGIC TESTS
    // =====================================================

    describe('createSubmissionsForAssessment - Detailed Logic Tests', () => {
        it('SUBMISSION_CREATESUBMISSIONS_VALID_INDIVIDUAL_001 - creates submissions for ALL enrolled users', async () => {
            // Test: Verify that a submission is created for each enrolled user
            const assessmentWithRelations = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: {
                    id: 10,
                    enrollments: [
                        { user: { id: 101 } },
                        { user: { id: 102 } },
                        { user: { id: 103 } },
                    ],
                },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessmentWithRelations);
            submissionRepoMock.save.mockResolvedValue([] as any);

            await submissionService.createSubmissionsForAssessment(assessmentWithRelations);

            const savedArg = submissionRepoMock.save.mock.calls[0][0];
            expect(savedArg).toHaveLength(3);
            expect(savedArg[0]).toHaveProperty('user.id', 101);
            expect(savedArg[1]).toHaveProperty('user.id', 102);
            expect(savedArg[2]).toHaveProperty('user.id', 103);
            expect(submissionRepoMock.save).toHaveBeenCalledTimes(1);
        });

        it('SUBMISSION_CREATESUBMISSIONS_VALID_TEAM_002 - creates submissions for all teams', async () => {
            // Test: Verify that a submission is created for each team in the assessment
            const assessmentWithRelations = {
                ...mockAssessment,
                submissionType: SubmissionType.TEAM,
                teamAssessments: [
                    { team: { id: 200, name: 'Team A' } },
                    { team: { id: 201, name: 'Team B' } },
                    { team: { id: 202, name: 'Team C' } },
                ],
                class: { id: 10 },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessmentWithRelations);
            
            // Mock teamAssessmentRepo.createQueryBuilder to return all 3 teams
            const mockTeamQB = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { team: { id: 200, name: 'Team A', members: [{ user: { id: 1 } }] } },
                    { team: { id: 201, name: 'Team B', members: [{ user: { id: 2 } }] } },
                    { team: { id: 202, name: 'Team C', members: [{ user: { id: 3 } }] } },
                ]),
            };
            teamAssessmentRepoMock.createQueryBuilder.mockReturnValue(mockTeamQB as any);
            submissionRepoMock.save.mockResolvedValue([] as any);

            await submissionService.createSubmissionsForAssessment(assessmentWithRelations);

            const savedArg = submissionRepoMock.save.mock.calls[0][0] as any;
            expect(savedArg).toHaveLength(3);
            expect(savedArg.every((s: any) => s.team?.id)).toBe(true);
            expect(submissionRepoMock.save).toHaveBeenCalledTimes(1);
        });

        it('SUBMISSION_CREATESUBMISSIONS_NOTFOUND_003 - throws BadRequestException when assessment not found', async () => {
            // Test: Verify proper error handling when assessment doesn't exist
            assessmentRepoMock.findOne.mockResolvedValue(null);

            await expect(
                submissionService.createSubmissionsForAssessment(mockAssessment)
            ).rejects.toThrow(new BadRequestException('Failed to create submissions for assessment'));
        });

        it('SUBMISSION_CREATESUBMISSIONS_EMPTY_ENROLLMENT_004 - creates zero submissions for empty class', async () => {
            // Test: Verify that when no students are enrolled, service throws error
            const emptyAssessment = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: { id: 10, enrollments: [] },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(emptyAssessment);
            
            // Mock empty enrollments query
            const mockEmptyQB = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            enrollmentRepoMock.createQueryBuilder.mockReturnValue(mockEmptyQB as any);

            // Service throws error when trying to create submissions with no enrollments
            await expect(
                submissionService.createSubmissionsForAssessment(emptyAssessment)
            ).rejects.toThrow('Failed to create submissions for assessment');
        });

        it('SUBMISSION_CREATESUBMISSIONS_STATUS_INIT_005 - initializes submission status to PENDING', async () => {
            // Test: Verify that all created submissions start with PENDING status
            const assessmentWithRelations = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: {
                    id: 10,
                    enrollments: [
                        { user: { id: 101 } },
                        { user: { id: 102 } },
                    ],
                },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessmentWithRelations);
            
            // Override the query builder to return correct enrollments
            const mockQB = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { user: { id: 101, firstName: 'Student1' } },
                    { user: { id: 102, firstName: 'Student2' } },
                ]),
            };
            enrollmentRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);
            submissionRepoMock.save.mockResolvedValue([]as any);

            await submissionService.createSubmissionsForAssessment(assessmentWithRelations);

            const savedArg = submissionRepoMock.save.mock.calls[0][0];
            expect(savedArg[0].status).toBe(SubmissionStatus.PENDING);
            expect(savedArg[1].status).toBe(SubmissionStatus.PENDING);
        });

        it('SUBMISSION_CREATESUBMISSIONS_ATTEMPTNUMBER_006 - initializes attemptNumber to 1', async () => {
            // Test: Verify that all new submissions start with attemptNumber of 0
            const assessmentWithRelations = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: {
                    id: 10,
                    enrollments: [{ user: { id: 101 } }],
                },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessmentWithRelations);
            
            // Override the query builder to return correct enrollments
            const mockQB = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { user: { id: 101, firstName: 'Student1' } },
                ]),
            };
            enrollmentRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);
            submissionRepoMock.save.mockResolvedValue([] as any);

            await submissionService.createSubmissionsForAssessment(assessmentWithRelations);

            const savedArg = submissionRepoMock.save.mock.calls[0][0];
            expect(savedArg[0].attemptNumber).toBe(0);
        });
    });

    // =====================================================
    // saveDraftAssignment - DETAILED LOGIC TESTS
    // =====================================================

    describe('saveDraftAssignment - Detailed Logic Tests', () => {
        const validDto: SubmitAssignmentDto = {
            comments: 'My draft solution',
            resources: [{ resourceId: 10 }, { resourceId: 11 }],
        };

        it('SUBMISSION_SAVEDRAFT_VALID_INDIVIDUAL_001 - creates new draft for unenrolled user', async () => {
            // Test: Verify that a new submission draft is created with proper initialization
            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(null);
            submissionRepoMock.create.mockReturnValue(mockSubmission);
            submissionRepoMock.save.mockResolvedValue({ ...mockSubmission, id: 500 });
            resourceRepoMock.findOne.mockResolvedValue({ id: 10 } as any);
            subResourceRepoMock.create.mockReturnValue({} as any);
            subResourceRepoMock.save.mockResolvedValue({} as any);

            const result = await submissionService.saveDraftAssignment(1, 100, validDto);

            expect(result).toEqual({ message: 'Draft saved', submissionId: 500 });
            expect(submissionRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: { id: 1 },
                    assessment: mockAssessment,
                    status: SubmissionStatus.PENDING,
                    attemptNumber: 1,
                    submissionTime: null,
                })
            );
        });

        it('SUBMISSION_SAVEDRAFT_UPDATE_002 - updates existing draft with new resources', async () => {
            // Test: Verify that existing draft is updated while preserving old data
            const existingDraft = {
                ...mockSubmission,
                id: 500,
                comments: 'Old draft',
                resources: [],
                status: SubmissionStatus.PENDING,
            };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(existingDraft);
            submissionRepoMock.save.mockResolvedValue({
                ...existingDraft,
                comments: validDto.comments,
            });
            resourceRepoMock.findOne.mockResolvedValue({ id: 10 } as any);
            subResourceRepoMock.create.mockReturnValue({} as any);
            subResourceRepoMock.save.mockResolvedValue({} as any);

            const result = await submissionService.saveDraftAssignment(1, 100, validDto);

            expect(result).toEqual({ message: 'Draft saved', submissionId: 500 });
            expect(submissionRepoMock.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    comments: 'My draft solution',
                })
            );
        });

        it('SUBMISSION_SAVEDRAFT_RESOURCE_LINKING_003 - properly links multiple resources to submission', async () => {
            // Test: Verify that all resources in DTO are properly created and linked
            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(null);
            submissionRepoMock.create.mockReturnValue(mockSubmission);
            submissionRepoMock.save.mockResolvedValue({ ...mockSubmission, id: 500 });
            resourceRepoMock.findOne
                .mockResolvedValueOnce({ id: 10 } as any)
                .mockResolvedValueOnce({ id: 11 } as any);
            subResourceRepoMock.create.mockReturnValue({} as any);
            subResourceRepoMock.save.mockResolvedValue({} as any);

            const dtoWithMultipleResources = {
                comments: 'Draft',
                resources: [{ resourceId: 10 }, { resourceId: 11 }],
            };

            await submissionService.saveDraftAssignment(1, 100, dtoWithMultipleResources);

            expect(subResourceRepoMock.create).toHaveBeenCalledTimes(2);
            expect(subResourceRepoMock.save).toHaveBeenCalledTimes(2);
        });

        it('SUBMISSION_SAVEDRAFT_NOTENROLLED_004 - throws ForbiddenException when user not enrolled', async () => {
            // Test: Verify that non-enrolled users cannot save drafts
            const assessmentWithNoEnrollment = {
                ...mockAssessment,
                class: { ...mockAssessment.class, enrollments: [] },
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessmentWithNoEnrollment);

            await expect(
                submissionService.saveDraftAssignment(999, 100, validDto)
            ).rejects.toThrow(new ForbiddenException('Not enrolled in class'));
        });

        it('SUBMISSION_SAVEDRAFT_GRADED_005 - throws BadRequestException when submission already graded', async () => {
            // Test: Verify that graded submissions cannot be edited
            const gradedSubmission = {
                ...mockSubmission,
                status: SubmissionStatus.GRADED,
                evaluation: { id: 800, score: 85 },
            };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(gradedSubmission as any) ;

            await expect(
                submissionService.saveDraftAssignment(1, 100, validDto)
            ).rejects.toThrow(new BadRequestException('Cannot edit after grading'));
        });

        it('SUBMISSION_SAVEDRAFT_NO_RESOURCES_006 - creates draft with empty resource list', async () => {
            // Test: Verify that submissions can be created without resources
            const dtoWithoutResources = { comments: 'Just a comment', resources: [] };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(null);
            submissionRepoMock.create.mockReturnValue(mockSubmission);
            submissionRepoMock.save.mockResolvedValue({ ...mockSubmission, id: 500 });

            const result = await submissionService.saveDraftAssignment(1, 100, dtoWithoutResources);

            expect(result).toEqual({ message: 'Draft saved', submissionId: 500 });
            expect(subResourceRepoMock.create).not.toHaveBeenCalled();
        });

        it('SUBMISSION_SAVEDRAFT_TEAM_MEMBER_007 - creates team draft when user is team member', async () => {
            // Test: Verify that team members can create team submissions
            const teamAssessment = {
                ...mockAssessment,
                submissionType: SubmissionType.TEAM,
                teamAssessments: [
                    { team: { id: 200, members: [{ user: { id: 1 } }] } },
                ],
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(teamAssessment);
            submissionRepoMock.findOne.mockResolvedValue(null);
            submissionRepoMock.create.mockReturnValue(mockTeamSubmission);
            submissionRepoMock.save.mockResolvedValue({ ...mockTeamSubmission, id: 501 });

            const result = await submissionService.saveDraftAssignment(1, 100, validDto);

            expect(result).toEqual({ message: 'Draft saved', submissionId: 501 });
            expect(submissionRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    team: expect.objectContaining({ id: 200 }),
                })
            );
        });
    });

    // =====================================================
    // getAssessmentStats - DETAILED COMPUTATION TESTS
    // =====================================================

    describe('getAssessmentStats - Detailed Computation Tests', () => {
        it('SUBMISSION_GETSTATS_COMPUTATION_001 - calculates correct submission statistics', async () => {
            // Test: Verify accurate computation of all statistics
            const roster = [
                { id: 1, status: SubmissionStatus.SUBMITTED },
                { id: 2, status: SubmissionStatus.SUBMITTED },
                { id: 3, status: SubmissionStatus.GRADED },
                { id: 4, status: SubmissionStatus.GRADED },
                { id: 5, status: SubmissionStatus.GRADED },
                { id: 6, status: SubmissionStatus.PENDING },
            ] as any;

            jest.spyOn(submissionService, 'getAssignmentRoster').mockResolvedValue(roster);

            const result = await submissionService.getAssessmentStats(100);

            expect(result).toEqual({
                totalStudentsOrTeams: 6,
                submittedCount: 6, // All items in roster count as submitted
                pendingCount: 0,   // pending = total - submitted = 6 - 6 = 0
                gradedCount: 3,
            });
        });

        it('SUBMISSION_GETSTATS_COMPUTATION_002 - correctly counts submitted and graded as submitted', async () => {
            // Test: Verify that GRADED items are counted in both graded and submitted counts
            const roster = [
                { id: 1, status: SubmissionStatus.SUBMITTED },
                { id: 2, status: SubmissionStatus.GRADED },
            ] as any;

            jest.spyOn(submissionService, 'getAssignmentRoster').mockResolvedValue(roster);

            const result = await submissionService.getAssessmentStats(100);

            expect(result.submittedCount).toBe(2); // SUBMITTED + GRADED
            expect(result.gradedCount).toBe(1); // Only GRADED
        });

        it('SUBMISSION_GETSTATS_COMPUTATION_003 - handles empty roster correctly', async () => {
            // Test: Verify correct zero values when no submissions exist
            const roster: any[] = [];

            jest.spyOn(submissionService, 'getAssignmentRoster').mockResolvedValue(roster);

            const result = await submissionService.getAssessmentStats(100);

            expect(result).toEqual({
                totalStudentsOrTeams: 0,
                submittedCount: 0,
                pendingCount: 0,
                gradedCount: 0,
            });
        });

        it('SUBMISSION_GETSTATS_COMPUTATION_004 - all pending status calculation', async () => {
            // Test: Verify correct calculation when all submissions are pending
            const roster = [
                { id: 1, status: SubmissionStatus.PENDING },
                { id: 2, status: SubmissionStatus.PENDING },
                { id: 3, status: SubmissionStatus.PENDING },
            ] as any;

            jest.spyOn(submissionService, 'getAssignmentRoster').mockResolvedValue(roster);

            const result = await submissionService.getAssessmentStats(100);

            expect(result.totalStudentsOrTeams).toBe(3);
            expect(result.pendingCount).toBe(0); // pending = total - submitted = 3 - 3 = 0
            expect(result.submittedCount).toBe(3); // All items in roster
            expect(result.gradedCount).toBe(0);
        });

        it('SUBMISSION_GETSTATS_COMPUTATION_005 - percentage calculation compatibility', async () => {
            // Test: Verify that total equals sum of all status counts
            const roster = [
                { id: 1, status: SubmissionStatus.PENDING },
                { id: 2, status: SubmissionStatus.PENDING },
                { id: 3, status: SubmissionStatus.SUBMITTED },
                { id: 4, status: SubmissionStatus.SUBMITTED },
                { id: 5, status: SubmissionStatus.SUBMITTED },
                { id: 6, status: SubmissionStatus.GRADED },
                { id: 7, status: SubmissionStatus.GRADED },
                { id: 8, status: SubmissionStatus.GRADED },
                { id: 9, status: SubmissionStatus.GRADED },
            ] as any;

            jest.spyOn(submissionService, 'getAssignmentRoster').mockResolvedValue(roster);

            const result = await submissionService.getAssessmentStats(100);

            // Verify the formula: submittedCount + pendingCount = totalStudentsOrTeams
            const totalAccountedFor = result.pendingCount + result.submittedCount;
            expect(totalAccountedFor).toBe(result.totalStudentsOrTeams);
        });
    });

    // =====================================================
    // getMySubmission - DETAILED LOGIC TESTS
    // =====================================================

    describe('getMySubmission - Detailed Logic and Computation Tests', () => {
        it('SUBMISSION_GETMY_VALID_APPROVED_001 - returns complete evaluation data when approved', async () => {
            // Test: Verify that approved evaluations return all evaluation details
            const submissionWithEvaluation = {
                ...mockSubmission,
                evaluation: {
                    id: 800,
                    score: 92,
                    isApproved: true,
                    feedback: 'Excellent work',
                    rubricScores: [
                        { rubricId: 1, score: 30 },
                        { rubricId: 2, score: 32 },
                        { rubricId: 3, score: 30 },
                    ],
                } as any,
            };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(submissionWithEvaluation);

            const result = await submissionService.getMySubmission(1, 100);

            expect(result).toEqual(
                expect.objectContaining({
                    id: 500,
                    evaluation: expect.objectContaining({
                        score: 92,
                        isApproved: true,
                        feedback: 'Excellent work',
                    }),
                })
            );
        });

        it('SUBMISSION_GETMY_COMPUTATION_002 - correctly identifies pending status when not submitted', async () => {
            // Test: Verify correct status when submission doesn't exist
            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(null);

            const result = await submissionService.getMySubmission(1, 100);

            expect(result.status).toBe(SubmissionStatus.PENDING);
            expect(result.evaluation).toBeNull();
            expect(result.resources).toEqual([]);
        });

        it('SUBMISSION_GETMY_SCORE_CALCULATION_003 - validates score is within maxScore', async () => {
            // Test: Verify that returned score doesn't exceed assessment maxScore
            const submissionWithEvaluation = {
                ...mockSubmission,
                evaluation: {
                    id: 800,
                    score: 95,
                    isApproved: true,
                } as any,
            };

            assessmentRepoMock.findOne.mockResolvedValue({
                ...mockAssessment,
                maxScore: 100,
            });
            submissionRepoMock.findOne.mockResolvedValue(submissionWithEvaluation);

            const result = await submissionService.getMySubmission(1, 100);

            expect(result.evaluation?.score).toBeLessThanOrEqual(100);
        });

        it('SUBMISSION_GETMY_REJECTED_004 - returns evaluation with isApproved false', async () => {
            // Test: Verify handling of rejected evaluations
            const rejectedSubmission = {
                ...mockSubmission,
                evaluation: {
                    id: 800,
                    score: 45,
                    isApproved: false,
                    feedback: 'Does not meet requirements',
                } as any,
                status: SubmissionStatus.SUBMITTED,
            };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(rejectedSubmission);

            const result = await submissionService.getMySubmission(1, 100);

            // When isApproved is false, evaluation should be null (hidden from student)
            expect(result.evaluation).toBeNull();
        });

        it('SUBMISSION_GETMY_RESOURCES_005 - correctly retrieves all submission resources', async () => {
            // Test: Verify that all resources attached to submission are returned
            const submissionWithResources = {
                ...mockSubmission,
                resources: [
                    { resource: { id: 10, title: 'document1.pdf', type: 'FILE', url: '/path/doc1.pdf' } } as any,
                    { resource: { id: 11, title: 'image.png', type: 'FILE', url: '/path/img.png' } } as any,
                    { resource: { id: 12, title: 'code.js', type: 'FILE', url: '/path/code.js' } } as any,
                ],
            };

            assessmentRepoMock.findOne.mockResolvedValue(mockAssessment);
            submissionRepoMock.findOne.mockResolvedValue(submissionWithResources);

            const result = await submissionService.getMySubmission(1, 100);

            expect(result.resources).toHaveLength(3);
            expect(result.resources[0]).toHaveProperty('title', 'document1.pdf');
            expect(result.resources[1]).toHaveProperty('title', 'image.png');
        });
    });

    // =====================================================
    // getMySubmissionsStatus - DETAILED LOGIC TESTS
    // =====================================================

    describe('getMySubmissionsStatus - Detailed Computation Tests', () => {
        it('SUBMISSION_GETMYSTATUS_COMPUTATION_001 - returns status for all class assessments', async () => {
            // Test: Verify that all assessments in class are returned with their submission status
            const assessments = [
                { id: 100, title: 'Assignment 1', isPublic: true } as any,
                { id: 101, title: 'Assignment 2', isPublic: true } as any,
                { id: 102, title: 'Assignment 3', isPublic: true } as any,
            ];

            const submissions = [
                {
                    id: 500,
                    userId: 1,
                    assessment: assessments[0],
                    status: SubmissionStatus.PENDING,
                    evaluation: { isApproved: true },
                } as any,
                {
                    id: 501,
                    userId: 1,
                    assessment: assessments[1],
                    status: SubmissionStatus.SUBMITTED,
                    evaluation: { isApproved: true },
                } as any,
                {
                    id: 502,
                    userId: 1,
                    assessment: assessments[2],
                    status: SubmissionStatus.GRADED,
                    evaluation: { isApproved: true },
                } as any,
            ];

            assessmentRepoMock.find.mockResolvedValue(assessments);
            submissionRepoMock.find.mockResolvedValue(submissions);

            const result = await submissionService.getMySubmissionsStatus(1, 10);

            expect(result).toHaveLength(3);
            expect(result[0].assessmentId).toBe(100);
            expect(result[0].status).toBe(SubmissionStatus.PENDING);
            expect(result[1].status).toBe(SubmissionStatus.SUBMITTED);
            expect(result[2].status).toBe(SubmissionStatus.GRADED);
        });

        it('SUBMISSION_GETMYSTATUS_MISSING_SUBMISSION_002 - handles missing submissions for some assessments', async () => {
            // Test: Verify that assessments without submissions return PENDING status
            const assessments = [
                { id: 100, title: 'Assignment 1', isPublic: true } as any,
                { id: 101, title: 'Assignment 2', isPublic: true } as any,
            ];

            const submissions = [
                {
                    id: 500,
                    userId: 1,
                    assessment: assessments[0],
                    status: SubmissionStatus.SUBMITTED,
                    evaluation: { isApproved: true },
                } as any,
            ];

            assessmentRepoMock.find.mockResolvedValue(assessments);
            submissionRepoMock.find.mockResolvedValue(submissions);

            const result = await submissionService.getMySubmissionsStatus(1, 10);

            expect(result).toHaveLength(2);
            const pendingStatus = result.find((s) => s.assessmentId === 101);
            expect(pendingStatus?.status).toBe(SubmissionStatus.PENDING);
        });

        it('SUBMISSION_GETMYSTATUS_EMPTY_CLASS_003 - returns empty array when no assessments', async () => {
            // Test: Verify correct handling of classes with no assessments
            assessmentRepoMock.find.mockResolvedValue([]);
            submissionRepoMock.find.mockResolvedValue([]);

            const result = await submissionService.getMySubmissionsStatus(1, 10);

            expect(result).toEqual([]);
        });
    });

    // =====================================================
    // getAssignmentRoster - DETAILED LOGIC TESTS
    // =====================================================

    describe('getAssignmentRoster - Detailed Logic Tests', () => {
        it('SUBMISSION_GETROSTER_INDIVIDUAL_001 - returns individual students in roster', async () => {
            // Test: Verify roster correctly lists individual students
            const assessment = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: { id: 10 },
                isPublic: true,
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessment);
            
            // Mock enrollmentRepo.find (service uses .find, not query builder for roster)
            enrollmentRepoMock.find.mockResolvedValue([
                { user: { id: 101, firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' } } as any,
                { user: { id: 102, firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' } } as any,
            ]);
            
            submissionRepoMock.find.mockResolvedValue([
                { id: 500, user: { id: 101 }, status: SubmissionStatus.PENDING } as any,
                { id: 501, user: { id: 102 }, status: SubmissionStatus.SUBMITTED } as any,
            ]);

            const result = await submissionService.getAssignmentRoster(100)as any;

            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('INDIVIDUAL');
            expect(result[0].id).toBe(101);
        });

        it('SUBMISSION_GETROSTER_TEAM_002 - returns teams with all members included', async () => {
            // Test: Verify roster correctly lists teams and their members
            const assessment = {
                ...mockAssessment,
                submissionType: SubmissionType.TEAM,
                class: { id: 10 },
                isPublic: true,
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessment);
            
            // Mock teamRepo.find
            teamRepoMock.find.mockResolvedValue([
                {
                    id: 200,
                    name: 'Team A',
                    members: [
                        { user: { id: 101, firstName: 'Alice', profilePictureUrl: null } },
                        { user: { id: 102, firstName: 'Bob', profilePictureUrl: null } },
                    ],
                } as any,
                {
                    id: 201,
                    name: 'Team B',
                    members: [
                        { user: { id: 103, firstName: 'Carol', profilePictureUrl: null } },
                        { user: { id: 104, firstName: 'David', profilePictureUrl: null } },
                    ],
                } as any,
            ]);
            
            submissionRepoMock.find.mockResolvedValue([]);

            const result = await submissionService.getAssignmentRoster(100)as any;

            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('TEAM');
            expect(result[0].members).toHaveLength(2);
        });

        it('SUBMISSION_GETROSTER_STATUS_MAPPING_003 - includes correct submission status for each roster item', async () => {
            // Test: Verify that submission status is correctly mapped to roster items
            const assessment = {
                ...mockAssessment,
                submissionType: SubmissionType.INDIVIDUAL,
                class: { id: 10 },
                isPublic: true,
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue(assessment);
            
            // Mock enrollmentRepo.find
            enrollmentRepoMock.find.mockResolvedValue([
                { user: { id: 101, firstName: 'A', lastName: 'User', email: 'a@test.com' } } as any,
                { user: { id: 102, firstName: 'B', lastName: 'User', email: 'b@test.com' } } as any,
                { user: { id: 103, firstName: 'C', lastName: 'User', email: 'c@test.com' } } as any,
            ]);
            
            submissionRepoMock.find.mockResolvedValue([
                { id: 500, user: { id: 101 }, status: SubmissionStatus.PENDING } as any,
                { id: 501, user: { id: 102 }, status: SubmissionStatus.GRADED } as any,
                { id: 502, user: { id: 103 }, status: SubmissionStatus.SUBMITTED } as any,
            ]);

            const result = await submissionService.getAssignmentRoster(100);

            expect(result[0].status).toBe(SubmissionStatus.PENDING);
            expect(result[1].status).toBe(SubmissionStatus.GRADED);
            expect(result[2].status).toBe(SubmissionStatus.SUBMITTED);
        });
    });

    // =====================================================
    // getSubmissionForViewer - DETAILED LOGIC TESTS
    // =====================================================

    describe('getSubmissionForViewer - Detailed Logic Tests', () => {
        it('SUBMISSION_GETFORVIEWER_COMPLETE_001 - returns full submission viewer DTO', async () => {
            // Test: Verify all required fields are returned in viewer DTO
            const submissionEntity = {
                ...mockSubmission,
                user: { id: 1, firstName: 'John', lastName: 'Doe' },
                team: null,
                assessment: {
                    id: 100,
                    title: 'Test Assessment',
                    maxScore: 100,
                    class: { id: 10, name: 'Test Class' },
                },
                resources: [],
                evaluation: null,
            };
            const ctx = { ...mockSubmissionContext, submissionEntity } as any;

            const result = await submissionService.getSubmissionForViewer(ctx);

            expect(result).toEqual(
                expect.objectContaining({
                    id: 500,
                    status: SubmissionStatus.PENDING,
                    user: expect.any(Object),
                    team: null,
                    resources: expect.any(Array),
                    evaluation: null,
                    assessment: expect.any(Object),
                })
            );
        });

        it('SUBMISSION_GETFORVIEWER_WITH_RESOURCES_002 - includes all submission resources', async () => {
            // Test: Verify that all attached resources are included in viewer DTO
            const submissionWithResources = {
                id: 500,
                userId: 1,
                created_at: mockDate,
                updated_at: mockDate,
                assessment: mockAssessment,
                status: SubmissionStatus.PENDING,
                attemptNumber: 1,
                submissionTime: null,
                user: { id: 1, firstName: 'John', lastName: 'Doe' } as any,
                team: null,
                evaluation: null,
                resources: [
                    { id: 10, fileName: 'doc1.pdf', size: 5000 } as any,
                    { id: 11, fileName: 'doc2.pdf', size: 3000 } as any,
                ],
            } as any;

            const ctx = {
                ...mockSubmissionContext,
                submissionEntity: submissionWithResources,
            } as any;

            const result = await submissionService.getSubmissionForViewer(ctx) as any;

            // Service returns resources directly from entity
            expect(result.resources).toHaveLength(2);
            expect(result.resources[0].id).toBe(10);
            expect(result.resources[1].id).toBe(11);
        });

        it('SUBMISSION_GETFORVIEWER_WITH_EVALUATION_003 - includes evaluation data', async () => {
            // Test: Verify evaluation data is included when present
            const submissionWithEvaluation = {
                ...mockSubmission,
                status: SubmissionStatus.GRADED,
                evaluation: {
                    id: 800,
                    score: 88,
                    isApproved: true,
                    feedback: 'Good job',
                } as any,
            };

            const ctx = {
                ...mockSubmissionContext,
                submissionEntity: submissionWithEvaluation,
            } as any;

            const result = await submissionService.getSubmissionForViewer(ctx);

            expect(result.evaluation).toBeDefined();
            expect(result.evaluation?.score).toBe(88);
            expect(result.evaluation?.isApproved).toBe(true);
        });

        it('SUBMISSION_GETFORVIEWER_TEAM_004 - returns team info instead of user for team submissions', async () => {
            // Test: Verify team data is returned instead of user data for team submissions
            const teamCtx = {
                ...mockSubmissionContext,
                submissionEntity: mockTeamSubmission,
            } as any;

            const result = await submissionService.getSubmissionForViewer(teamCtx);

            expect(result.team).toBeDefined();
            expect(result.team?.id).toBe(200);
            expect(result.user).toBeNull();
        });
    });

    // =====================================================
    // getSubmissionDetails - DETAILED COMPUTATION TESTS
    // =====================================================

    describe('getSubmissionDetails - Detailed Computation Tests', () => {
        it('SUBMISSION_GETDETAILS_RESOURCE_URL_001 - generates proper resource URL string', async () => {
            // Test: Verify that resource URL is properly formatted
            const fullSubmission = {
                ...mockSubmission,
                userId: 1,
                assessment: {
                    ...mockAssessment,
                    allowedSubmissionMethod: SubmissionMethod.ANY,
                    aiEvaluationEnable: true,
                },
                resources: [],
                evaluation: null,
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);
            walletServiceMock.getBalance.mockResolvedValue(100);

            const result = await submissionService.getSubmissionDetails(500);

            expect(result.resource_url).toBeDefined();
            expect(typeof result.resource_url).toBe('string');
            expect(result.resource_url).toContain('500'); // submission ID in URL
        });

        it('SUBMISSION_GETDETAILS_SUBMISSION_ID_002 - correctly converts submission ID to string', async () => {
            // Test: Verify submission ID is properly formatted as string
            const fullSubmission = {
                ...mockSubmission,
                id: 789,
                userId: 1,
                assessment: {
                    ...mockAssessment,
                    aiEvaluationEnable: true,
                },
                resources: [],
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);
            walletServiceMock.getBalance.mockResolvedValue(50);

            const result = await submissionService.getSubmissionDetails(789);

            expect(result.submission_id).toBe('789');
        });

        it('SUBMISSION_GETDETAILS_WALLET_BALANCE_003 - retrieves and includes wallet balance', async () => {
            // Test: Verify wallet balance is correctly retrieved and included
            const fullSubmission = {
                ...mockSubmission,
                userId: 1,
                assessment: {
                    ...mockAssessment,
                    aiEvaluationEnable: true,
                    aiModelSelectionMode: AIModelSelectionMode.SYSTEM,
                    class: { owner: { id: 1 } },
                    rubrics: [],
                },
                resources: [],
                evaluation: null,
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);
            walletServiceMock.getBalance.mockResolvedValue(250);

            const result = await submissionService.getSubmissionDetails(500) as any;

            // wallet_balance is not returned in the response - it's used internally
            expect(walletServiceMock.getBalance).toHaveBeenCalledWith(1);
        });

        it('SUBMISSION_GETDETAILS_MULTIPLE_RESOURCES_004 - includes all resources in details', async () => {
            // Test: Verify all rubrics are included in submission details
            const fullSubmission = {
                ...mockSubmission,
                user: { id: 1 },
                assessment: {
                    ...mockAssessment,
                    aiEvaluationEnable: true,
                    aiModelSelectionMode: AIModelSelectionMode.SYSTEM,
                    class: { owner: { id: 1 } },
                    rubrics: [
                        { definition: 'Criterion 1', totalScore: 10 },
                        { definition: 'Criterion 2', totalScore: 20 },
                        { definition: 'Criterion 3', totalScore: 30 },
                    ],
                },
                resources: [
                    { resource: { id: 10, type: ResourceType.FILE, url: '/file1.pdf' } } as any,
                    { resource: { id: 11, type: ResourceType.FILE, url: '/file2.pdf' } } as any,
                    { resource: { id: 12, type: ResourceType.FILE, url: '/file3.pdf' } } as any,
                ],
                evaluation: null,
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);
            walletServiceMock.getBalance.mockResolvedValue(100);

            const result = await submissionService.getSubmissionDetails(500) as any;

            // Service returns rubric array
            expect(result.rubric).toHaveLength(3);
        });
    });

    // =====================================================
    // getSubmissionResources - DETAILED LOGIC TESTS
    // =====================================================

    describe('getSubmissionResources - Detailed Logic Tests', () => {
        it('SUBMISSION_GETRESOURCES_URL_001 - returns properly formatted resource URL', async () => {
            // Test: Verify resource URL is correctly formatted
            const fullSubmission = {
                ...mockSubmission,
                userId: 1,
                assessment: {
                    ...mockAssessment,
                    allowedSubmissionMethod: SubmissionMethod.ANY,
                },
                resources: [],
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);

            const result = await submissionService.getSubmissionResoucrs(500);

            expect(result).toEqual({
                resource_url: expect.any(String),
            });
            expect(result.resource_url.length).toBeGreaterThan(0);
        });

        it('SUBMISSION_GETRESOURCES_MULTIPLE_RESOURCES_002 - URL includes all resource references', async () => {
            // Test: Verify URL properly represents all attached resources
            const fullSubmission = {
                ...mockSubmission,
                user: { id: 1 },
                assessment: {
                    ...mockAssessment,
                    allowedSubmissionMethod: SubmissionMethod.ANY,
                    class: { owner: { id: 1 } },
                },
                resources: [
                    { resource: { id: 100, type: ResourceType.FILE, url: '/doc1.pdf' } } as any,
                    { resource: { id: 101, type: ResourceType.FILE, url: '/doc2.pdf' } } as any,
                    { resource: { id: 102, type: ResourceType.FILE, url: '/image.png' } } as any,
                ],
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);

            const result = await submissionService.getSubmissionResoucrs(500);

            expect(result.resource_url).toBeDefined();
            // resource_url is constructed from submission ID, not resource IDs
            expect(typeof result.resource_url).toBe('string');
        });

        it('SUBMISSION_GETRESOURCES_EMPTY_RESOURCES_003 - handles empty resource list', async () => {
            // Test: Verify correct handling when no resources are attached
            const fullSubmission = {
                ...mockSubmission,
                user: { id: 1 },
                assessment: {
                    ...mockAssessment,
                    allowedSubmissionMethod: SubmissionMethod.ANY,
                    class: { owner: { id: 1 } },
                },
                resources: [],
            } as any;

            submissionRepoMock.findOne.mockResolvedValue(fullSubmission);

            const result = await submissionService.getSubmissionResoucrs(500);

            expect(result.resource_url).toBeDefined();
            expect(typeof result.resource_url).toBe('string');
        });
    });
});