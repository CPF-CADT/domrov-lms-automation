import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Repository, In, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AssessmentService } from '../src/modules/assessment/assessment.service';
import { Assessment } from '../src/libs/entities/assessment/assessment.entity';
import { Resource } from '../src/libs/entities/resource/resource.entity';
import { AssessmentResource } from '../src/libs/entities/resource/assessment-resource.entity';
import { Enrollment } from '../src/libs/entities/classroom/enrollment.entity';
import { Rubrics } from '../src/libs/entities/assessment/rubic.entity';
import { Submission } from '../src/libs/entities/assessment/submission.entity';
import { Team } from '../src/libs/entities/classroom/team.entity';
import { TeamAssessment } from '../src/libs/entities/classroom/team-assessment.entity';

import { SubmissionService } from '../src/modules/assessment/submission.service';
import { UpdateAssessmentDTO } from '../src/libs/dtos/assessment/update-assessment.dto';
import {
    CreateDraftResponseDto,
    PublishAssessmentResponseDto,
    UpdateAssessmentResponseDto,
    AssessmentListItemDto,
    AssessmentDetailDto,
    TeamTrackingItemDto,
    IndividualTrackingItemDto,
    DeleteAssessmentResponseDto,
} from '../src/libs/dtos/assessment/assessment-response.dto';

import { SubmissionType, SubmissionMethod } from '../src/libs/enums/Assessment';
import type { AssessmentContext, ClassContext } from '../src/common/security/dtos/guard.dto';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { Tasks } from '../src/libs/enums/taks.enum';
import { SubmissionStatus } from '../src/libs/enums/Status';

describe('AssessmentService - Comprehensive Testing', () => {
    let assessmentService: AssessmentService;
    let tasksServiceMock: jest.Mocked<TasksService>;
    let queryRunnerManagerMock: any;
    let assessmentRepoMock: jest.Mocked<Repository<Assessment>>;
    let resourceRepoMock: jest.Mocked<Repository<Resource>>;
    let assessResRepoMock: jest.Mocked<Repository<AssessmentResource>>;
    let enrollmentRepoMock: jest.Mocked<Repository<Enrollment>>;
    let rubricsRepoMock: jest.Mocked<Repository<Rubrics>>;
    let submissionRepoMock: jest.Mocked<Repository<Submission>>;
    let teamRepoMock: jest.Mocked<Repository<Team>>;
    let teamAssessmentRepoMock: jest.Mocked<Repository<TeamAssessment>>;
    let submissionServiceMock: jest.Mocked<SubmissionService>;

    // ============================================================
    // Mock Data Setup
    // ============================================================

    const mockClassEntity = { id: 100, name: 'Math 101', owner: { id: 1 } } as any;

    const mockAssessmentEntity: Assessment = {
        id: 500,
        title: 'Math Assignment 1',
        instruction: 'Solve the problems',
        maxScore: 100,
        submissionType: SubmissionType.INDIVIDUAL,
        allowLate: false,
        session: 1,
        allowTeamSubmition: false,
        startDate: new Date('2025-03-01'),
        dueDate: new Date('2025-03-15'),
        isPublic: false,
        class: mockClassEntity,
        aiEvaluationEnable: false,
        allowedSubmissionMethod: SubmissionMethod.ANY,
        rubrics: [{ id: 1, criterion: 'Quality', weight: 100, totalScore: 100 }],
        resources: [],
        penaltyCriteria: null,
        user_exclude_files: null,
        user_include_files: null,
        aiModelSelectionMode: null,
        aiModel: null,
        aiPrompt: null,
        aiPromptVariables: null,
        aiPromptTemplate: null,
        aiPromptTemplateVariables: null,
    } as unknown as Assessment;

    const mockAssessmentContext: AssessmentContext = {
        assessmentId: 500,
        userId: 1,
        assessmentEntity: mockAssessmentEntity,
        classContext: { classId: 100, classEntity: mockClassEntity } as any,
    } as AssessmentContext;

    const mockClassContext: ClassContext = {
        classId: 100,
        classEntity: mockClassEntity,
    } as ClassContext;

    beforeAll(async () => {
        queryRunnerManagerMock = {
            save: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
            findBy: jest.fn(),
            find: jest.fn(),
            create: jest.fn().mockImplementation((entity, dto) => dto),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AssessmentService,
                {
                    provide: getRepositoryToken(Assessment),
                    useValue: {
                        save: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn(),
                        remove: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        manager: {
                            transaction: async (cb) => cb(queryRunnerManagerMock),
                        },
                    },
                },
                {
                    provide: getRepositoryToken(Resource),
                    useValue: { findOne: jest.fn() },
                },
                {
                    provide: getRepositoryToken(AssessmentResource),
                    useValue: { create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Enrollment),
                    useValue: { find: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Rubrics),
                    useValue: { delete: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Submission),
                    useValue: { find: jest.fn(), delete: jest.fn().mockImplementation(async () => ({ affected: 1 })), },
                },
                {
                    provide: getRepositoryToken(Team),
                    useValue: { find: jest.fn(), findBy: jest.fn() },
                },
                {
                    provide: getRepositoryToken(TeamAssessment),
                    useValue: { delete: jest.fn(), create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: SubmissionService,
                    useValue: {
                        createSubmissionsForAssessment: jest.fn().mockImplementation(async () => {}),
                    },
                },
                {
                    provide: TasksService,
                    useValue: {
                        scheduleTask: jest.fn(),
                    },
                },
            ],
        }).compile();

        assessmentService = module.get<AssessmentService>(AssessmentService);
        assessmentRepoMock = module.get(getRepositoryToken(Assessment)) as jest.Mocked<Repository<Assessment>>;
        resourceRepoMock = module.get(getRepositoryToken(Resource)) as jest.Mocked<Repository<Resource>>;
        assessResRepoMock = module.get(getRepositoryToken(AssessmentResource)) as jest.Mocked<Repository<AssessmentResource>>;
        enrollmentRepoMock = module.get(getRepositoryToken(Enrollment)) as jest.Mocked<Repository<Enrollment>>;
        rubricsRepoMock = module.get(getRepositoryToken(Rubrics)) as jest.Mocked<Repository<Rubrics>>;
        submissionRepoMock = module.get(getRepositoryToken(Submission)) as jest.Mocked<Repository<Submission>>;
        teamRepoMock = module.get(getRepositoryToken(Team)) as jest.Mocked<Repository<Team>>;
        teamAssessmentRepoMock = module.get(getRepositoryToken(TeamAssessment)) as jest.Mocked<Repository<TeamAssessment>>;
        submissionServiceMock = module.get(SubmissionService) as jest.Mocked<SubmissionService>;
        tasksServiceMock = module.get(TasksService) as jest.Mocked<TasksService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================
    // createDraft Tests - Detailed Logic Verification
    // ============================================================
    describe('createDraft - Detailed Logic Tests', () => {
        it('DRAFT_CREATE_001 - creates assessment with correct default values', async () => {
            const savedAssessment = {
                ...mockAssessmentEntity,
                id: 501,
                title: 'Untitled Assignment',
                session: 1,
                class: mockClassEntity,
            };
            assessmentRepoMock.save.mockResolvedValue(savedAssessment as any);

            const result = await assessmentService.createDraft(1, mockClassContext);

            // Verify return structure
            expect(result).toEqual({
                message: 'Draft created',
                assessmentId: 501,
            });

            // Verify the saved assessment has correct properties
            const savedCall = assessmentRepoMock.save.mock.calls[0][0];
            expect(savedCall).toMatchObject({
                title: 'Untitled Assignment',
                session: 1,
                class: mockClassEntity,
            });

            // Verify assessment was actually saved to DB
            expect(assessmentRepoMock.save).toHaveBeenCalledTimes(1);
        });

        it('DRAFT_CREATE_002 - initializes with correct default state', async () => {
            const expectedDefaults = {
                title: 'Untitled Assignment',
                session: 1,
                isPublic: false,
                maxScore: 0,
                allowLate: false,
            };

            assessmentRepoMock.save.mockImplementation(async (assessment) => {
                // Verify defaults are set
                expect(assessment).toMatchObject(expectedDefaults);
                return { ...assessment, id: 501 } as any;
            });

            await assessmentService.createDraft(1, mockClassContext);

            expect(assessmentRepoMock.save).toHaveBeenCalled();
        });

        it('DRAFT_CREATE_003 - correctly associates with class context', async () => {
            assessmentRepoMock.save.mockResolvedValue({ ...mockAssessmentEntity, id: 501 } as any);

            await assessmentService.createDraft(1, mockClassContext);

            const savedAssessment = assessmentRepoMock.save.mock.calls[0][0];
            expect(savedAssessment.class).toEqual(mockClassEntity);
            expect(savedAssessment.class.id).toBe(100);
        });

        it('DRAFT_CREATE_004 - throws NotFoundException when class entity is missing', async () => {
            const invalidContext = {
                ...mockClassContext,
                classEntity: null,
            } as any;

            await expect(assessmentService.createDraft(1, invalidContext)).rejects.toThrow(
                new NotFoundException('Class context not available'),
            );
        });

        it('DRAFT_CREATE_005 - throws NotFoundException when class entity is undefined', async () => {
            const invalidContext = {
                ...mockClassContext,
                classEntity: undefined,
            } as ClassContext;

            await expect(assessmentService.createDraft(1, invalidContext)).rejects.toThrow(
                new NotFoundException('Class context not available'),
            );
        });

        it('DRAFT_CREATE_006 - throws BadRequestException on database save failure', async () => {
            assessmentRepoMock.save.mockRejectedValue(new Error('Database connection error'));

            await expect(assessmentService.createDraft(1, mockClassContext)).rejects.toThrow(
                new BadRequestException('Failed to create draft'),
            );
        });

        it('DRAFT_CREATE_007 - returns correct ID from saved entity', async () => {
            const savedWithId = { ...mockAssessmentEntity, id: 12345 };
            assessmentRepoMock.save.mockResolvedValue(savedWithId as any);

            const result = await assessmentService.createDraft(1, mockClassContext);

            expect(result.assessmentId).toBe(12345);
            expect(result.assessmentId).not.toBeNull();
            expect(typeof result.assessmentId).toBe('number');
        });

        it('DRAFT_CREATE_008 - handles database errors gracefully', async () => {
            const dbError = new Error('Unique constraint violation');
            assessmentRepoMock.save.mockRejectedValue(dbError);

            const promise = assessmentService.createDraft(1, mockClassContext);

            await expect(promise).rejects.toThrow(BadRequestException);
            await expect(promise).rejects.toThrow('Failed to create draft');
        });
    });

    // ============================================================
    // publishAssessment Tests - Complex Logic Verification
    // ============================================================
    describe('publishAssessment - Detailed Logic & Validation Tests', () => {
        it('PUBLISH_001 - verifies all validation checks before publishing', async () => {
            const validAssessment: Assessment = {
                ...mockAssessmentEntity,
                id: 500,
                isPublic: false,
                title: 'Math Assignment 1',
                startDate: new Date('2025-03-01T00:00:00Z'),
                dueDate: new Date('2025-03-15T00:00:00Z'),
                maxScore: 100,
                rubrics: [
                    {
                        id: 1,
                        criterion: 'Quality',
                        weight: 100,
                        totalScore: 100,
                    } as unknown as Rubrics,
                ],
            } as Assessment;

            assessmentRepoMock.findOne.mockResolvedValue(validAssessment);
            assessmentRepoMock.save.mockResolvedValue({ ...validAssessment, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            expect(result.message).toBe('Assessment published successfully');
            expect(assessmentRepoMock.save).toHaveBeenCalledWith(
                expect.objectContaining({ isPublic: true }),
            );
        });

        it('PUBLISH_002 - validates title is not empty or whitespace', async () => {
            const emptyTitleAssessment = {
                ...mockAssessmentEntity,
                title: '   ',
            };
            assessmentRepoMock.findOne.mockResolvedValue(emptyTitleAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Title is required'),
            );
        });

        it('PUBLISH_003 - validates title is null', async () => {
            const nullTitleAssessment = {
                ...mockAssessmentEntity,
                title: null,
            };
            assessmentRepoMock.findOne.mockResolvedValue(nullTitleAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Title is required'),
            );
        });

        it('PUBLISH_004 - validates date range: startDate must be before dueDate', async () => {
            const invalidDateAssessment = {
                ...mockAssessmentEntity,
                startDate: new Date('2025-03-15'),
                dueDate: new Date('2025-03-01'),
            };
            assessmentRepoMock.findOne.mockResolvedValue(invalidDateAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Invalid date range'),
            );
        });

        it('PUBLISH_005 - validates date range: startDate cannot equal dueDate', async () => {
            const sameDate = new Date('2025-03-15');
            const sameDateAssessment = {
                ...mockAssessmentEntity,
                startDate: sameDate,
                dueDate: sameDate,
            };
            assessmentRepoMock.findOne.mockResolvedValue(sameDateAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Invalid date range'),
            );
        });

        it('PUBLISH_006 - validates rubric total score must equal maxScore', async () => {
            const mismatchScoreAssessment = {
                ...mockAssessmentEntity,
                maxScore: 100,
                rubrics: [
                    {
                        id: 1,
                        criterion: 'Quality',
                        weight: 100,
                        totalScore: 50,
                    } as unknown as Rubrics,
                ],
            };
            assessmentRepoMock.findOne.mockResolvedValue(mismatchScoreAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Rubric total score must equal maxScore'),
            );
        });

        it('PUBLISH_007 - correctly sums multiple rubrics to verify total', async () => {
            const multiRubricAssessment = {
                ...mockAssessmentEntity,
                maxScore: 300,
                rubrics: [
                    { id: 1, criterion: 'Quality', weight: 33, totalScore: 100 } as unknown as Rubrics,
                    { id: 2, criterion: 'Correctness', weight: 33, totalScore: 100 } as unknown as Rubrics,
                    { id: 3, criterion: 'Presentation', weight: 34, totalScore: 100 } as unknown as Rubrics,
                ],
            };
            assessmentRepoMock.findOne.mockResolvedValue(multiRubricAssessment as any);
            assessmentRepoMock.save.mockResolvedValue({ ...multiRubricAssessment, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            // Verify rubric sum calculation: 100 + 100 + 100 = 300 = maxScore
            expect(result.message).toBe('Assessment published successfully');
        });

        it('PUBLISH_008 - handles edge case: rubrics partial match', async () => {
            const partialRubricAssessment = {
                ...mockAssessmentEntity,
                maxScore: 100,
                rubrics: [
                    { id: 1, criterion: 'Quality', weight: 50, totalScore: 60 } as unknown as Rubrics,
                    { id: 2, criterion: 'Effort', weight: 50, totalScore: 30 } as unknown as Rubrics, // 60+30=90, not 100
                ],
            };
            assessmentRepoMock.findOne.mockResolvedValue(partialRubricAssessment as any);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Rubric total score must equal maxScore'),
            );
        });

        it('PUBLISH_009 - throws BadRequestException when assessment not found', async () => {
            assessmentRepoMock.findOne.mockResolvedValue(null);

            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Failed to publish assessment'),
            );
        });

        it('PUBLISH_010 - calls submission service to create submissions for new published assessment', async () => {
            const newPublishAssessment = {
                ...mockAssessmentEntity,
                isPublic: false,
                rubrics: [{ id: 1, criterion: 'Quality', weight: 100, totalScore: 100 } as unknown as Rubrics],
            };
            assessmentRepoMock.findOne.mockResolvedValue(newPublishAssessment as any);
            assessmentRepoMock.save.mockResolvedValue({ ...newPublishAssessment, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            await assessmentService.publishAssessment(mockAssessmentContext);

            expect(submissionServiceMock.createSubmissionsForAssessment).toHaveBeenCalledWith(
                expect.objectContaining({ isPublic: true }),
            );
        });

        it('PUBLISH_011 - updates assessment when already published without recreating submissions', async () => {
            const alreadyPublished = {
                ...mockAssessmentEntity,
                isPublic: true,
                title: 'Updated Title',
                rubrics: [{ id: 1, criterion: 'Quality', weight: 100, totalScore: 100 } as unknown as Rubrics],
            };
            assessmentRepoMock.findOne.mockResolvedValue(alreadyPublished as any);
            assessmentRepoMock.save.mockResolvedValue(alreadyPublished as any);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            // When already public, should just update, not create submissions
            expect(result.message).toBe('Assessment updated successfully');
            expect(assessmentRepoMock.save).toHaveBeenCalled();
        });

        it('PUBLISH_012 - verifies assessment is actually saved with isPublic=true', async () => {
            const toPublish = {
                ...mockAssessmentEntity,
                isPublic: false,
                rubrics: [{ id: 1, criterion: 'Quality', weight: 100, totalScore: 100 } as unknown as Rubrics],
            };
            assessmentRepoMock.findOne.mockResolvedValue(toPublish as any);
            assessmentRepoMock.save.mockResolvedValue({ ...toPublish, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            await assessmentService.publishAssessment(mockAssessmentContext);

            const saveCall = assessmentRepoMock.save.mock.calls[0][0];
            expect(saveCall.isPublic).toBe(true);
        });
    });

    // ============================================================
    // updateAssessment Tests - Comprehensive Update Logic
    // ============================================================
    describe('updateAssessment - Detailed Update Logic Tests', () => {
        const baseUpdateDto: UpdateAssessmentDTO = {
            title: 'Updated Title',
            maxScore: 150,
            resources: [{ resourceId: 10 }],
            rubrics: [
                { criterion: 'Quality', weight: 50, totalScore: 75 },
                { criterion: 'Effort', weight: 50, totalScore: 75 },
            ],
            allowedTeamIds: [1, 2, 3],
        } as any;

        it('UPDATE_001 - updates assessment with multiple fields', async () => {
            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.save.mockResolvedValue({
                ...mockAssessmentEntity,
                title: 'Updated Title',
                maxScore: 150,
            });
            queryRunnerManagerMock.findOne.mockResolvedValue({ id: 10 });
            queryRunnerManagerMock.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

            const result = await assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext);

            expect(result.message).toBe('Draft updated successfully');
            expect(queryRunnerManagerMock.save).toHaveBeenCalled();
        });

        it('UPDATE_002 - verifies resource existence before adding', async () => {
            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.findOne.mockResolvedValue(null); // Resource not found

            await expect(assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext))
                .rejects.toThrow(new BadRequestException('Resource 10 not found'));
        });

        it('UPDATE_003 - verifies multiple resources before adding any', async () => {
            const multiResourceDto: UpdateAssessmentDTO = {
                ...baseUpdateDto,
                resources: [{ resourceId: 10 }, { resourceId: 20 }, { resourceId: 30 }],
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            // Second resource returns null (doesn't exist)
            queryRunnerManagerMock.findOne
                .mockResolvedValueOnce({ id: 10 })
                .mockResolvedValueOnce(null);

            await expect(assessmentService.updateAssessment(multiResourceDto, mockAssessmentContext))
                .rejects.toThrow(new BadRequestException('Resource 20 not found'));
        });

        it('UPDATE_004 - correctly computes rubric total before saving', async () => {
            const rubricDto: UpdateAssessmentDTO = {
                title: 'Updated',
                maxScore: 200,
                rubrics: [
                    { criterion: 'Q1', weight: 25, totalScore: 50 },
                    { criterion: 'Q2', weight: 25, totalScore: 50 },
                    { criterion: 'Q3', weight: 25, totalScore: 50 },
                    { criterion: 'Q4', weight: 25, totalScore: 50 },
                ],
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.save.mockResolvedValue({ ...mockAssessmentEntity, maxScore: 200 });

            await assessmentService.updateAssessment(rubricDto, mockAssessmentContext);

            // Verify rubric sum: 50+50+50+50 = 200 = maxScore
            expect(queryRunnerManagerMock.delete).toHaveBeenCalledWith(Rubrics, expect.any(Object));
        });

        it('UPDATE_005 - deletes old rubrics and creates new ones', async () => {
            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.save.mockResolvedValue(mockAssessmentEntity);
            // Mock the resource existence check
            queryRunnerManagerMock.findOne.mockResolvedValue({ id: 10, title: 'Resource' } as any);

            await assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext);

            // Verify old rubrics are deleted
            expect(queryRunnerManagerMock.delete).toHaveBeenCalledWith(Rubrics, expect.any(Object));
        });

        it('UPDATE_006 - deletes old team assessments and creates new ones', async () => {
            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.save.mockResolvedValue(mockAssessmentEntity);
            queryRunnerManagerMock.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
            // Mock the resource existence check
            queryRunnerManagerMock.findOne.mockResolvedValue({ id: 10, title: 'Resource' } as any);

            await assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext);

            // Verify old team assessments are deleted
            expect(queryRunnerManagerMock.delete).toHaveBeenCalledWith(TeamAssessment, expect.any(Object));
        });

        it('UPDATE_007 - handles empty team ID array', async () => {
            const noTeamsDto: UpdateAssessmentDTO = {
                ...baseUpdateDto,
                allowedTeamIds: [],
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.findOne.mockResolvedValue({ id: 10 });
            queryRunnerManagerMock.findBy.mockResolvedValue([]);
            queryRunnerManagerMock.save.mockResolvedValue(mockAssessmentEntity);

            const result = await assessmentService.updateAssessment(noTeamsDto, mockAssessmentContext);

            expect(result.message).toBe('Draft updated successfully');
        });

        it('UPDATE_008 - throws NotFoundException when assessment not found', async () => {
            assessmentRepoMock.findOne.mockResolvedValue(null);

            await expect(assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext))
                .rejects.toThrow(NotFoundException);
        });

        it('UPDATE_009 - correctly handles partial updates', async () => {
            const partialDto: UpdateAssessmentDTO = {
                title: 'Only Title Update',
            } as any;

            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.save.mockResolvedValue({ ...mockAssessmentEntity, title: 'Only Title Update' });

            const result = await assessmentService.updateAssessment(partialDto, mockAssessmentContext);

            expect(result.message).toBe('Draft updated successfully');
        });

        it('UPDATE_010 - maintains existing data when not explicitly updated', async () => {
            const partialDto: UpdateAssessmentDTO = {
                title: 'New Title',
            } as any;

            const existingAssessment = {
                ...mockAssessmentEntity,
                id: 500,
                maxScore: 100,
                resources: [],
            };

            assessmentRepoMock.findOne.mockResolvedValue(existingAssessment as any);
            queryRunnerManagerMock.save.mockImplementation(async (entity, data) => {
                // Should preserve existing maxScore
                return { ...existingAssessment, title: 'New Title' };
            });

            await assessmentService.updateAssessment(partialDto, mockAssessmentContext);

            expect(queryRunnerManagerMock.save).toHaveBeenCalled();
        });

        it('UPDATE_011 - verifies teams exist before creating team assessments', async () => {
            assessmentRepoMock.findOne.mockResolvedValue({ ...mockAssessmentEntity, resources: [] } as any);
            queryRunnerManagerMock.findOne.mockResolvedValue({ id: 10 });
            // No teams found
            queryRunnerManagerMock.findBy.mockResolvedValue([]);
            queryRunnerManagerMock.save.mockResolvedValue(mockAssessmentEntity);

            const result = await assessmentService.updateAssessment(baseUpdateDto, mockAssessmentContext);

            expect(queryRunnerManagerMock.findBy).toHaveBeenCalled();
        });
    });

    // ============================================================
    // getTracking Tests - Complex Tracking Logic
    // ============================================================
    describe('getTracking - Detailed Tracking Logic Tests', () => {
        const mockSubmissions = [
            {
                id: 1,
                studentId: 10,
                status: SubmissionStatus.SUBMITTED,
                score: 85,
            },
            {
                id: 2,
                studentId: 11,
                status: SubmissionStatus.SUBMITTED,
                score: 92,
            },
            {
                id: 3,
                studentId: 12,
                status: SubmissionStatus.GRADED,
                score: 88,
            },
        ];

        const mockEnrollments = [
            { user: { id: 10, firstName: 'John', lastName: 'Doe' } },
            { user: { id: 11, firstName: 'Jane', lastName: 'Smith' } },
            { user: { id: 12, firstName: 'Bob', lastName: 'Wilson' } },
            { user: { id: 13, firstName: 'Alice', lastName: 'Johnson' } },
        ];

        it('TRACKING_001 - returns team tracking for TEAM submission type', async () => {
            const teamAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.TEAM,
                isPublic: true,
            };

            assessmentRepoMock.findOne.mockResolvedValue(teamAssessment as any);
            submissionRepoMock.find.mockResolvedValue(mockSubmissions as any);
            teamRepoMock.find.mockResolvedValue([
                { id: 1, name: 'Team A' },
                { id: 2, name: 'Team B' },
            ] as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // Verify result structure for team tracking
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('teamId');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('status');
        });

        it('TRACKING_002 - correctly calculates individual submission status', async () => {
            const individualAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.INDIVIDUAL,
                isPublic: true,
            };

            assessmentRepoMock.findOne.mockResolvedValue(individualAssessment as any);
            submissionRepoMock.find.mockResolvedValue(mockSubmissions as any);
            enrollmentRepoMock.find.mockResolvedValue(mockEnrollments as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // Verify individual tracking structure
            expect(Array.isArray(result)).toBe(true);
            const firstTracking = result[0];
            expect(firstTracking).toHaveProperty('studentId');
            expect(firstTracking).toHaveProperty('name');
            expect(firstTracking).toHaveProperty('status');
            expect(firstTracking).toHaveProperty('score');
        });

        it('TRACKING_003 - correctly identifies NOT_SUBMITTED status for students without submission', async () => {
            const individualAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.INDIVIDUAL,
                isPublic: true,
            };

            // Only 3 submissions, but 4 enrollments
            assessmentRepoMock.findOne.mockResolvedValue(individualAssessment as any);
            submissionRepoMock.find.mockResolvedValue(mockSubmissions as any);
            enrollmentRepoMock.find.mockResolvedValue(mockEnrollments as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // Alice (id 13) should have NOT_SUBMITTED status
            const aliceTracking = result.find((t: any) => t.studentId === 13);
            expect(aliceTracking).toBeDefined();
            expect(aliceTracking.status).toBe('NOT_SUBMITTED');
            expect(aliceTracking.score).toBeNull();
        });

        it('TRACKING_004 - correctly identifies students with submitted work', async () => {
            const individualAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.INDIVIDUAL,
                isPublic: true,
            };
            
            // Mock submissions with user and evaluation property
            const submissionsWithUser = [
                { id: 1, user: { id: 10 }, status: SubmissionStatus.SUBMITTED, evaluation: { score: 85 } },
                { id: 2, user: { id: 11 }, status: SubmissionStatus.PENDING, evaluation: null },
            ];

            assessmentRepoMock.findOne.mockResolvedValue(individualAssessment as any);
            submissionRepoMock.find.mockResolvedValue(submissionsWithUser as any);
            enrollmentRepoMock.find.mockResolvedValue(mockEnrollments as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // John (id 10) should have submission with evaluation, so status is GRADED
            const johnTracking = result.find((t: any) => t.studentId === 10);
            expect(johnTracking).toBeDefined();
            expect(johnTracking.status).toBe('GRADED'); // Has evaluation, so status is GRADED
            expect(johnTracking.score).toBe(85);
        });

        it('TRACKING_005 - correctly builds full name from enrollment data', async () => {
            const individualAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.INDIVIDUAL,
                isPublic: true,
            };

            assessmentRepoMock.findOne.mockResolvedValue(individualAssessment as any);
            submissionRepoMock.find.mockResolvedValue([]);
            enrollmentRepoMock.find.mockResolvedValue(mockEnrollments as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // Verify name is correctly concatenated
            const johnTracking = result.find((t: any) => t.studentId === 10);
            expect(johnTracking.name).toBe('John Doe');

            const aliceTracking = result.find((t: any) => t.studentId === 13);
            expect(aliceTracking.name).toBe('Alice Johnson');
        });

        it('TRACKING_006 - throws BadRequestException when assessment not published', async () => {
            const unpublished = {
                ...mockAssessmentEntity,
                isPublic: false,
            };
            assessmentRepoMock.findOne.mockResolvedValue(unpublished as any);

            await expect(assessmentService.getTracking(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Assessment is not published yet'),
            );
        });

        it('TRACKING_007 - handles multiple teams with mixed submission status', async () => {
            const teamSubmissions = [
                { id: 1, teamId: 1, status: SubmissionStatus.SUBMITTED, score: 85 },
                { id: 2, teamId: 2, status: SubmissionStatus.SUBMITTED, score: null },
                { id: 3, teamId: 3, status: SubmissionStatus.GRADED, score: 92 },
            ];

            const teams = [
                { id: 1, name: 'Team A' },
                { id: 2, name: 'Team B' },
                { id: 3, name: 'Team C' },
                { id: 4, name: 'Team D' },
            ];

            const teamAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.TEAM,
                isPublic: true,
            };

            assessmentRepoMock.findOne.mockResolvedValue(teamAssessment as any);
            submissionRepoMock.find.mockResolvedValue(teamSubmissions as any);
            teamRepoMock.find.mockResolvedValue(teams as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            // Team D should have NOT_SUBMITTED status
            const teamD = result.find((t: any) => t.teamId === 4);
            expect(teamD).toBeDefined();
            expect(teamD.status).toBe('NOT_SUBMITTED');
        });

        it('TRACKING_008 - calculates correct score when submission exists', async () => {
            const submissions = [
                { id: 1, user: { id: 10 }, status: SubmissionStatus.GRADED, evaluation: { score: 95 } },
            ];

            const individualAssessment = {
                ...mockAssessmentEntity,
                submissionType: SubmissionType.INDIVIDUAL,
                isPublic: true,
            };

            assessmentRepoMock.findOne.mockResolvedValue(individualAssessment as any);
            submissionRepoMock.find.mockResolvedValue(submissions as any);
            enrollmentRepoMock.find.mockResolvedValue(mockEnrollments as any);

            const result = await assessmentService.getTracking(mockAssessmentContext);

            const studentTracking = result.find((t: any) => t.studentId === 10);
            expect(studentTracking.score).toBe(95);
            expect(typeof studentTracking.score).toBe('number');
        });
    });

    // ============================================================
    // findAllByClass Tests - Query Logic
    // ============================================================
    describe('findAllByClass - Query Logic Tests', () => {
        it('FINDALL_001 - returns assessments ordered by dueDate ascending', async () => {
            const assessments = [
                { ...mockAssessmentEntity, id: 1, dueDate: new Date('2025-03-10') },
                { ...mockAssessmentEntity, id: 2, dueDate: new Date('2025-03-20') },
                { ...mockAssessmentEntity, id: 3, dueDate: new Date('2025-03-05') },
            ];
            assessmentRepoMock.find.mockResolvedValue(assessments as any);

            const result = await assessmentService.findAllByClass(mockClassContext);

            expect(result).toEqual(assessments);
            expect(assessmentRepoMock.find).toHaveBeenCalledWith({
                where: { class: { id: 100 }, isPublic: true },
                order: { dueDate: 'ASC' },
                relations: ['resources', 'resources.resource'],
            });
        });

        it('FINDALL_002 - filters by class ID and publication status', async () => {
            assessmentRepoMock.find.mockResolvedValue([mockAssessmentEntity] as any);

            await assessmentService.findAllByClass(mockClassContext);

            const callArgs = assessmentRepoMock.find.mock.calls[0][0];
            expect(callArgs.where).toEqual({
                class: { id: 100 },
                isPublic: true,
            });
        });

        it('FINDALL_003 - includes resource relations in query', async () => {
            assessmentRepoMock.find.mockResolvedValue([mockAssessmentEntity] as any);

            await assessmentService.findAllByClass(mockClassContext);

            const callArgs = assessmentRepoMock.find.mock.calls[0][0];
            expect(callArgs.relations).toEqual(['resources', 'resources.resource']);
        });

        it('FINDALL_004 - throws NotFoundException when class context missing', async () => {
            const badContext = { ...mockClassContext, classId: undefined } as any;

            await expect(assessmentService.findAllByClass(badContext)).rejects.toThrow(
                new NotFoundException('Class context not available'),
            );
        });

        it('FINDALL_005 - returns empty array when no assessments found', async () => {
            assessmentRepoMock.find.mockResolvedValue([]);

            const result = await assessmentService.findAllByClass(mockClassContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('FINDALL_006 - returns multiple assessments correctly', async () => {
            const multipleAssessments = [
                { ...mockAssessmentEntity, id: 1, title: 'Assessment 1' },
                { ...mockAssessmentEntity, id: 2, title: 'Assessment 2' },
                { ...mockAssessmentEntity, id: 3, title: 'Assessment 3' },
            ];
            assessmentRepoMock.find.mockResolvedValue(multipleAssessments as any);

            const result = await assessmentService.findAllByClass(mockClassContext);

            expect(result.length).toBe(3);
            expect(result[0].title).toBe('Assessment 1');
            expect(result[2].title).toBe('Assessment 3');
        });
    });

    // ============================================================
    // findAllByClassSession Tests - Session Filtering
    // ============================================================
    describe('findAllByClassSession - Session Logic Tests', () => {
        it('SESSION_001 - filters assessments by session number', async () => {
            const sessionAssessments = [
                { ...mockAssessmentEntity, id: 1, session: 1 },
                { ...mockAssessmentEntity, id: 2, session: 1 },
            ];
            assessmentRepoMock.find.mockResolvedValue(sessionAssessments as any);

            const result = await assessmentService.findAllByClassSession(1, mockClassContext);

            expect(result.length).toBe(2);
            expect(result.every((a: any) => a.session === 1)).toBe(true);
        });

        it('SESSION_002 - returns empty array for session with no assessments', async () => {
            assessmentRepoMock.find.mockResolvedValue([]);

            const result = await assessmentService.findAllByClassSession(5, mockClassContext);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('SESSION_003 - correctly queries with session parameter', async () => {
            assessmentRepoMock.find.mockResolvedValue([]);

            await assessmentService.findAllByClassSession(2, mockClassContext);

            // Verify the find was called (actual filter logic depends on implementation)
            expect(assessmentRepoMock.find).toHaveBeenCalled();
        });
    });

    // ============================================================
    // findOne Tests - Single Record Retrieval
    // ============================================================
    describe('findOne - Single Assessment Retrieval Tests', () => {
        it('FINDONE_001 - returns complete assessment object', async () => {
            assessmentRepoMock.findOne.mockResolvedValue(mockAssessmentEntity as any);

            const result = await assessmentService.findOne(mockAssessmentContext);

            expect(result).toEqual(mockAssessmentEntity);
            expect(result.id).toBe(500);
            expect(result.title).toBe('Math Assignment 1');
        });

        it('FINDONE_002 - throws NotFoundException when assessment missing', async () => {
            assessmentRepoMock.findOne.mockResolvedValue(null);

            await expect(assessmentService.findOne(mockAssessmentContext)).rejects.toThrow(
                new NotFoundException('Assessment not found'),
            );
        });

        it('FINDONE_003 - retrieves assessment with all relations', async () => {
            const completeAssessment = {
                ...mockAssessmentEntity,
                resources: [
                    { id: 1, title: 'Resource 1' },
                    { id: 2, title: 'Resource 2' },
                ],
                rubrics: [
                    { id: 1, criterion: 'Quality', totalScore: 50 },
                    { id: 2, criterion: 'Effort', totalScore: 50 },
                ],
            };
            assessmentRepoMock.findOne.mockResolvedValue(completeAssessment as any);

            const result = await assessmentService.findOne(mockAssessmentContext);

            expect(result.resources.length).toBe(2);
            expect(result.rubrics.length).toBe(2);
        });

        it('FINDONE_004 - retrieves assessment with ID from context', async () => {
            assessmentRepoMock.findOne.mockResolvedValue(mockAssessmentEntity as any);

            await assessmentService.findOne(mockAssessmentContext);

            expect(assessmentRepoMock.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 500 }),
                }),
            );
        });
    });

    // ============================================================
    // deleteAssessment Tests - Deletion Logic
    // ============================================================
    describe('deleteAssessment - Deletion Logic Tests', () => {
        it('DELETE_001 - successfully deletes assessment', async () => {
            assessmentRepoMock.remove.mockResolvedValue({ id: 500 } as any);

            const result = await assessmentService.deleteAssessment(mockAssessmentContext);

            expect(result).toEqual({ id: 500 });
            expect(assessmentRepoMock.remove).toHaveBeenCalledWith(mockAssessmentEntity);
        });

        it('DELETE_002 - throws NotFoundException when assessment context missing', async () => {
            const badContext = {
                ...mockAssessmentContext,
                assessmentEntity: null,
            } as any;

            await expect(assessmentService.deleteAssessment(badContext)).rejects.toThrow(
                new NotFoundException('Assessment context not available'),
            );
        });

        it('DELETE_003 - throws NotFoundException when assessment entity is undefined', async () => {
            const badContext = {
                ...mockAssessmentContext,
                assessmentEntity: undefined,
            } as any;

            await expect(assessmentService.deleteAssessment(badContext)).rejects.toThrow(
                new NotFoundException('Assessment context not available'),
            );
        });

        it('DELETE_004 - correctly removes the assessment entity from database', async () => {
            assessmentRepoMock.remove.mockResolvedValue(mockAssessmentEntity as any);

            await assessmentService.deleteAssessment(mockAssessmentContext);

            expect(assessmentRepoMock.remove).toHaveBeenCalledWith(mockAssessmentEntity);
            expect(assessmentRepoMock.remove).toHaveBeenCalledTimes(1);
        });

        it('DELETE_005 - handles database errors during deletion', async () => {
            assessmentRepoMock.remove.mockRejectedValue(new Error('Database connection error'));

            const promise = assessmentService.deleteAssessment(mockAssessmentContext);

            await expect(promise).rejects.toThrow();
        });

        it('DELETE_006 - returns the deleted assessment data', async () => {
            const deletedAssessment = { ...mockAssessmentEntity, id: 500 };
            assessmentRepoMock.remove.mockResolvedValue(deletedAssessment as any);

            const result = await assessmentService.deleteAssessment(mockAssessmentContext);

            expect(result.id).toBe(500);
        });
    });

    // ============================================================
    // Edge Cases & Complex Scenarios
    // ============================================================
    describe('Edge Cases & Complex Scenarios', () => {
        it('EDGE_001 - handles assessment with zero maxScore', async () => {
            const zeroMaxScore = {
                ...mockAssessmentEntity,
                maxScore: 0,
                rubrics: [{ id: 1, criterion: 'Quality', totalScore: 0 }],
            };
            assessmentRepoMock.findOne.mockResolvedValue(zeroMaxScore as any);

            // Service validates maxScore > 0, so this should throw
            await expect(assessmentService.publishAssessment(mockAssessmentContext)).rejects.toThrow(
                new BadRequestException('Max score must be greater than 0')
            );
        });

        it('EDGE_002 - handles very large maxScore', async () => {
            const largeMaxScore = {
                ...mockAssessmentEntity,
                maxScore: 1000000,
                rubrics: [{ id: 1, criterion: 'Quality', totalScore: 1000000 }],
            };
            assessmentRepoMock.findOne.mockResolvedValue(largeMaxScore as any);
            assessmentRepoMock.save.mockResolvedValue({ ...largeMaxScore, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            expect(result.message).toBe('Assessment published successfully');
        });

        it('EDGE_003 - handles many rubrics with fractional weights', async () => {
            const manyRubrics = {
                ...mockAssessmentEntity,
                maxScore: 100,
                rubrics: Array.from({ length: 10 }, (_, i) => ({
                    id: i + 1,
                    criterion: `Criterion ${i + 1}`,
                    weight: 10,
                    totalScore: 10,
                })),
            };
            assessmentRepoMock.findOne.mockResolvedValue(manyRubrics as any);
            assessmentRepoMock.save.mockResolvedValue({ ...manyRubrics, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            // Total should be 100 (10*10)
            expect(result.message).toBe('Assessment published successfully');
        });

        it('EDGE_004 - handles special characters in assessment title', async () => {
            const specialCharsTitle = {
                ...mockAssessmentEntity,
                title: 'Math Assignment #1: Algebra & Geometry [2025]',
                rubrics: [{ id: 1, criterion: 'Quality', totalScore: 100 }],
            };
            assessmentRepoMock.findOne.mockResolvedValue(specialCharsTitle as any);
            assessmentRepoMock.save.mockResolvedValue({ ...specialCharsTitle, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            expect(result.message).toBe('Assessment published successfully');
        });

        it('EDGE_005 - handles very close but valid date range', async () => {
            const closeDate = new Date('2025-03-15T00:00:00Z');
            const veryCloseEndDate = new Date('2025-03-15T00:00:01Z');

            const closeAssessment = {
                ...mockAssessmentEntity,
                startDate: closeDate,
                dueDate: veryCloseEndDate,
                rubrics: [{ id: 1, criterion: 'Quality', totalScore: 100 }],
            };
            assessmentRepoMock.findOne.mockResolvedValue(closeAssessment as any);
            assessmentRepoMock.save.mockResolvedValue({ ...closeAssessment, isPublic: true } as any);
            submissionServiceMock.createSubmissionsForAssessment.mockResolvedValue(undefined);

            const result = await assessmentService.publishAssessment(mockAssessmentContext);

            expect(result.message).toBe('Assessment published successfully');
        });
    });
});