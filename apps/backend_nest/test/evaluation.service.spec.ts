import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { lastValueFrom, of, throwError } from 'rxjs';
import * as microservices from '@nestjs/microservices';
import * as grpcJs from '@grpc/grpc-js';

import { EvaluationService } from '../src/modules/evaluation/evaluation.service';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { AIUsageLogService } from '../src/modules/user-ai/ai-usage-log.service';
import { NotificationService } from '../src/services/notification.service';
import { Submission } from '../src/libs/entities/assessment/submission.entity';
import { Evaluation } from '../src/libs/entities/assessment/evaluation.entity';
import { UserAIKey } from '../src/libs/entities/ai/user-ai-key.entity';
import { SubmissionStatus } from '../src/libs/enums/Status';
import { AIModelSelectionMode, EvaluationType } from '../src/libs/enums/Assessment';
import { UserCreditBalance } from '../src/libs/entities/ai/user-credit-balance.entity';

describe('EvaluationService', () => {
    let service: EvaluationService;
    let mockClientGrpc: any;
    let mockWalletService: jest.Mocked<WalletService>;
    let mockAiLogService: jest.Mocked<AIUsageLogService>;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockDataSource: jest.Mocked<DataSource>;
    let mockSubmissionRepo: jest.Mocked<Repository<Submission>>;
    let mockAiKeyRepository: jest.Mocked<Repository<UserAIKey>>;
    let mockSubmissionService: any;
    let mockTasksQueueService: any;

    const mockSubmissionId = 1;
    const mockFilePathPath = '/path/to/submission';
    const mockUserId = 'user-123';
    const mockAiModel = 'grok-2';
    const mockInputTokens = 1000;
    const mockOutputTokens = 500;
    const mockFeedback = 'Great submission!';
    const mockScores = [85, 90, 88];

    beforeEach(async () => {
        // Mock gRPC services
        mockSubmissionService = {
            processSubmission: jest.fn(),
            GetSubmissionFolderStructure: jest.fn(),
        };

        mockTasksQueueService = {
            AddQueue: jest.fn(),
        };

        mockClientGrpc = {
            getService: jest.fn((serviceName: string) => {
                if (serviceName === 'SubmissionService') {
                    return mockSubmissionService;
                }
                if (serviceName === 'TasksQueue') {
                    return mockTasksQueueService;
                }
            }),
        };

        // Mock repositories and services
        mockWalletService = {
            deductCredits: jest.fn(),
        } as any;

        mockAiLogService = {
            createLog: jest.fn().mockResolvedValue({ id: 'log-123' }),
        } as any;

        mockNotificationService = {
            notifyStudent: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockDataSource = {
            transaction: jest.fn().mockImplementation(async (cb: Function) => cb({} as any)),
        } as any;

        mockSubmissionRepo = {
            findOne: jest.fn(),
        } as any;

        mockAiKeyRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EvaluationService,
                {
                    provide: 'CODE_EVAL_GRPC',
                    useValue: mockClientGrpc,
                },
                {
                    provide: WalletService,
                    useValue: mockWalletService,
                },
                {
                    provide: AIUsageLogService,
                    useValue: mockAiLogService,
                },
                {
                    provide: NotificationService,
                    useValue: mockNotificationService,
                },
                {
                    provide: getDataSourceToken(),
                    useValue: mockDataSource,
                },
                {
                    provide: getRepositoryToken(UserAIKey),
                    useValue: mockAiKeyRepository,
                },
                {
                    provide: getRepositoryToken(Submission),
                    useValue: mockSubmissionRepo,
                },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<EvaluationService>(EvaluationService);
        service.onModuleInit();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize submission and tasks queue services', () => {
            expect(mockClientGrpc.getService).toHaveBeenCalledWith('SubmissionService');
            expect(mockClientGrpc.getService).toHaveBeenCalledWith('TasksQueue');
            expect((service as any).submissionService).toBeDefined();
            expect((service as any).tasksQueueService).toBeDefined();
        });
    });

    // =====================================================
    // processSubmission Tests
    // =====================================================
    describe('processSubmission', () => {
        const submission_id = 'sub-123';
        const file_path = '/path/to/file.zip';

        it('should successfully process a submission and return result', async () => {
            const expectedResult = {
                success: true,
                message: 'Submission processed',
                data: { extracted: 'content' },
            };

            mockSubmissionService.processSubmission.mockReturnValue(of(expectedResult));

            const result = await service.processSubmission(submission_id, file_path);

            expect(result).toEqual(expectedResult);
            expect(mockSubmissionService.processSubmission).toHaveBeenCalledWith({
                submission_id,
                file_path,
            });
        });

        it('should throw NotFoundException when file not found (gRPC code 5)', async () => {
            const grpcError = new Error('NOT_FOUND');
            (grpcError as any).code = 5;

            mockSubmissionService.processSubmission.mockReturnValue(throwError(() => grpcError));

            await expect(service.processSubmission(submission_id, file_path)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.processSubmission(submission_id, file_path)).rejects.toThrow(
                `File not found or empty: ${file_path}`,
            );
        });

        it('should re-throw other gRPC errors', async () => {
            const grpcError = new Error('INTERNAL_ERROR');
            (grpcError as any).code = 13;

            mockSubmissionService.processSubmission.mockReturnValue(throwError(() => grpcError));

            await expect(service.processSubmission(submission_id, file_path)).rejects.toThrow(
                'INTERNAL_ERROR',
            );
        });

        it('should handle unknown error types', async () => {
            const unknownError = new Error('Unknown error type');

            mockSubmissionService.processSubmission.mockReturnValue(throwError(() => unknownError));

            await expect(service.processSubmission(submission_id, file_path)).rejects.toThrow(unknownError);
        });

        it('should log gRPC errors to console', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const grpcError = new Error('Test error');
            (grpcError as any).code = 13;

            mockSubmissionService.processSubmission.mockReturnValue(throwError(() => grpcError));

            try {
                await service.processSubmission(submission_id, file_path);
            } catch (err) {
                // Expected to throw
            }

            expect(consoleSpy).toHaveBeenCalledWith('gRPC error:', 'Test error');
            consoleSpy.mockRestore();
        });
    });

    // =====================================================
    // getSubmissionFolderStructure Tests
    // =====================================================
    describe('getSubmissionFolderStructure', () => {
        const submissionId = 'sub-123';

        it('should return parsed folder structure successfully', async () => {
            const folderStructure = { root: { children: ['file1.txt', 'file2.js'] } };
            const mockResponse = {
                folder_structure: JSON.stringify(folderStructure),
            };

            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(of(mockResponse));

            const result = await service.getSubmissionFolderStructure(submissionId);

            expect(result).toEqual({
                success: true,
                message: 'Folder structure fetched',
                folder_structure: folderStructure,
            });
        });

        it('should return empty object when folder_structure is null', async () => {
            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                of({ folder_structure: null }),
            );

            const result = await service.getSubmissionFolderStructure(submissionId);

            expect(result.folder_structure).toEqual({});
        });

        it('should return empty object when folder_structure is undefined', async () => {
            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                of({ folder_structure: undefined }),
            );

            const result = await service.getSubmissionFolderStructure(submissionId);

            expect(result.folder_structure).toEqual({});
        });

        it('should handle valid JSON string', async () => {
            const complexStructure = {
                root: {
                    name: 'project',
                    children: [
                        { name: 'src', children: [] },
                        { name: 'test', children: [] },
                    ],
                },
            };

            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                of({ folder_structure: JSON.stringify(complexStructure) }),
            );

            const result = await service.getSubmissionFolderStructure(submissionId);

            expect(result.folder_structure).toEqual(complexStructure);
        });

        it('should throw NotFoundException when submission not found (gRPC code 5)', async () => {
            const grpcError = new Error('NOT_FOUND');
            (grpcError as any).code = 5;

            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                throwError(() => grpcError),
            );

            await expect(service.getSubmissionFolderStructure(submissionId)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.getSubmissionFolderStructure(submissionId)).rejects.toThrow(
                `Submission structure not found for ID: ${submissionId}`,
            );
        });

        it('should re-throw non-NOT_FOUND gRPC errors', async () => {
            const grpcError = new Error('INTERNAL_ERROR');
            (grpcError as any).code = 13;

            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                throwError(() => grpcError),
            );

            await expect(service.getSubmissionFolderStructure(submissionId)).rejects.toThrow(
                'INTERNAL_ERROR',
            );
        });

        it('should log gRPC errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const grpcError = new Error('Test gRPC error');
            (grpcError as any).code = 13;

            mockSubmissionService.GetSubmissionFolderStructure.mockReturnValue(
                throwError(() => grpcError),
            );

            try {
                await service.getSubmissionFolderStructure(submissionId);
            } catch (err) {
                // Expected
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                'gRPC error (Folder Structure):',
                'Test gRPC error',
            );
            consoleSpy.mockRestore();
        });
    });

    // =====================================================
    // addTaskToQueue Tests
    // =====================================================
    describe('addTaskToQueue', () => {
        const submission_id = 'sub-123';

        it('should successfully add task to queue', async () => {
            const mockResponse = { success: true, message: 'Task queued' };

            mockTasksQueueService.AddQueue.mockReturnValue(of(mockResponse));

            const result = await service.addTaskToQueue(submission_id);

            expect(result).toEqual(mockResponse);
            expect(mockTasksQueueService.AddQueue).toHaveBeenCalledWith({ submission_id });
        });

        it('should throw BadRequestException when queue service returns success: false', async () => {
            const mockResponse = { success: false, message: 'Queue is full' };

            mockTasksQueueService.AddQueue.mockReturnValue(of(mockResponse));

            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow('Queue is full');
        });

        it('should handle gRPC error with details', async () => {
            const grpcError = new Error('Service unavailable');
            (grpcError as any).details = 'Queue service temporarily down';

            mockTasksQueueService.AddQueue.mockReturnValue(throwError(() => grpcError));

            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow(
                InternalServerErrorException,
            );
            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow(
                /Queue service temporarily down/,
            );
        });

        it('should throw InternalServerErrorException for unknown errors', async () => {
            const unknownError = new Error('Unknown error type');

            mockTasksQueueService.AddQueue.mockReturnValue(throwError(() => unknownError));

            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('should handle error with string message', async () => {
            const error = new Error('Connection refused');

            mockTasksQueueService.AddQueue.mockReturnValue(throwError(() => error));

            await expect(service.addTaskToQueue(submission_id)).rejects.toThrow(
                /Queue error.*Connection refused/,
            );
        });

        it('should re-throw BadRequestException if caught initially', async () => {
            const mockResponse = { success: false, message: 'Bad request' };

            mockTasksQueueService.AddQueue.mockReturnValue(of(mockResponse));

            const promise = service.addTaskToQueue(submission_id);

            await expect(promise).rejects.toThrow(BadRequestException);
        });
    });

    // =====================================================
    // aiEvaluate Tests
    // =====================================================
    describe('aiEvaluate', () => {
        const createMockSubmission = (overrides: Partial<Submission> = {}): Submission => {
            return {
                id: mockSubmissionId,
                status: SubmissionStatus.SUBMITTED,
                assessment: {
                    id: 1,
                    title: 'Test Assessment',
                    aiModelSelectionMode: AIModelSelectionMode.SYSTEM,
                    class: {
                        id: 1,
                        owner: { id: mockUserId } as any,
                    } as any,
                } as any,
                ...overrides,
            } as Submission;
        };

        describe('Input Validation', () => {
            it('should throw BadRequestException for empty scores array', async () => {
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(/Invalid scores array/);
            });

            it('should throw BadRequestException for non-array scores', async () => {
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        'not-array' as any,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
            });

            it('should throw BadRequestException for scores with non-numeric values', async () => {
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [85, 'ninety' as any, 88],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
            });

            it('should throw BadRequestException for negative scores', async () => {
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [85, -10, 88],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
            });

            it('should throw BadRequestException for NaN scores', async () => {
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [85, NaN, 88],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
            });

            it('should accept valid positive scores', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null), // no existing evaluation
                    create: jest.fn().mockReturnValue({}),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        [0, 100, 50],
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).resolves.not.toThrow();
            });
        });

        describe('Submission Fetching', () => {
            it('should throw NotFoundException when submission not found', async () => {
                const mockManager = {
                    findOne: jest.fn().mockResolvedValueOnce(null),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(NotFoundException);
                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(/Submission not found/);
            });

            it('should fetch submission with required relations', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({}),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockManager.findOne).toHaveBeenCalledWith(
                    Submission,
                    expect.objectContaining({
                        where: { id: Number(mockSubmissionId) },
                        relations: [
                            'assessment',
                            'assessment.class',
                            'assessment.class.owner',
                        ],
                    }),
                );
            });
        });

        describe('Existing Evaluation Check', () => {
            it('should throw ConflictException if evaluation already exists', async () => {
                const mockSubmission = createMockSubmission();
                const mockExistingEvaluation = { id: 1 };
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(mockExistingEvaluation),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(/already has an evaluation/);
            });

            it('should allow evaluation if no existing evaluation', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null), // no existing evaluation
                    create: jest.fn().mockReturnValue({}),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).resolves.not.toThrow();
            });
        });

        describe('Evaluation Entity Creation', () => {
            it('should create evaluation with correct total score', async () => {
                const scores = [10, 20, 30];
                const mockSubmission = createMockSubmission();
                const mockEvaluation = { id: 1, score: 60 };
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue(mockEvaluation),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    scores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockManager.create).toHaveBeenCalledWith(
                    Evaluation,
                    expect.objectContaining({
                        score: 60,
                        aiOutput: mockFeedback,
                        evaluationType: EvaluationType.AI,
                        submission: mockSubmission,
                    }),
                );
            });

            it('should handle scores with decimal values', async () => {
                const scores = [10.5, 20.3, 30.2];
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    scores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockManager.create).toHaveBeenCalledWith(
                    Evaluation,
                    expect.objectContaining({
                        score: 61,
                    }),
                );
            });
        });

        describe('Credit Deduction (System Mode)', () => {
            it('should deduct credits when in SYSTEM mode', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                mockWalletService.deductCredits.mockResolvedValue({ success: true }as unknown as UserCreditBalance);

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockWalletService.deductCredits).toHaveBeenCalledWith(
                    mockUserId,
                    expect.any(Number),
                    expect.any(String),
                    expect.stringContaining('Evaluate submission'),
                );
            });

            it('should not deduct credits when in USER mode', async () => {
                const mockSubmission = createMockSubmission({
                    assessment: {
                        ...createMockSubmission().assessment,
                        aiModelSelectionMode: AIModelSelectionMode.USER,
                    } as any,
                });

                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockWalletService.deductCredits).not.toHaveBeenCalled();
            });

            it('should throw BadRequestException if wallet deduction fails', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValue(mockSubmission) // Always return submission
                        .mockResolvedValueOnce(mockSubmission) // First call: submission
                        .mockResolvedValueOnce(null), // Second call: no existing evaluation
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                mockWalletService.deductCredits.mockRejectedValue(
                    new Error('Insufficient credits'),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(/Wallet deduction failed/);
            });
        });

        describe('Database Operations', () => {
            it('should save evaluation to database', async () => {
                const mockSubmission = createMockSubmission();
                const mockEvaluation = { id: 1 };
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue(mockEvaluation),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockManager.save).toHaveBeenCalledWith(Evaluation, mockEvaluation);
            });

            it('should update submission status to GRADED', async () => {
                const mockSubmission = createMockSubmission();
                const mockEvaluation = { id: 1 };
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue(mockEvaluation),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockSubmission.status).toBe(SubmissionStatus.GRADED);
                expect(mockManager.save).toHaveBeenCalledWith(Submission, mockSubmission);
            });

            it('should execute within a database transaction', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockDataSource.transaction).toHaveBeenCalled();
            });
        });

        describe('AI Usage Logging', () => {
            it('should create AI usage log with correct parameters', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(mockAiLogService.createLog).toHaveBeenCalledWith({
                    title: expect.stringContaining(`AI Evaluation - Submission ${mockSubmissionId}`),
                    inputTokenCount: mockInputTokens,
                    outputTokenCount: mockOutputTokens,
                    userId: mockUserId,
                });
            });
        });

        describe('Response', () => {
            it('should return success response with evaluation ID', async () => {
                const mockSubmission = createMockSubmission();
                const mockEvaluation = { id: 42 };
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue(mockEvaluation),
                    save: jest.fn().mockResolvedValue(mockEvaluation),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                const result = await service.aiEvaluate(
                    mockSubmissionId,
                    mockFeedback,
                    mockScores,
                    mockInputTokens,
                    mockOutputTokens,
                    mockAiModel,
                );

                expect(result).toEqual({
                    message: 'Evaluation created successfully',
                    evaluationId: 42,
                });
            });
        });

        describe('Error Handling', () => {
            it('should re-throw NotFoundException without wrapping', async () => {
                const mockManager = {
                    findOne: jest.fn().mockResolvedValueOnce(null),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(NotFoundException);
            });

            it('should re-throw ConflictException without wrapping', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce({}),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(ConflictException);
            });

            it('should re-throw BadRequestException without wrapping', async () => {
                const mockSubmission = createMockSubmission();
                const mockManager = {
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(mockSubmission)
                        .mockResolvedValueOnce(null),
                    create: jest.fn().mockReturnValue({ id: 1 }),
                    save: jest.fn().mockResolvedValue({ id: 1 }),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                mockWalletService.deductCredits.mockRejectedValue(
                    new BadRequestException('Credits insufficient'),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(BadRequestException);
            });

            it('should wrap unexpected errors in InternalServerErrorException', async () => {
                const mockManager = {
                    findOne: jest.fn().mockRejectedValueOnce(new Error('DB error')),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(InternalServerErrorException);
            });

            it('should include submission and model info in error context', async () => {
                const mockManager = {
                    findOne: jest.fn().mockRejectedValueOnce(new Error('DB error')),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                try {
                    await service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    );
                } catch (err: any) {
                    expect(err.message).toContain(`Submission: ${mockSubmissionId}`);
                    expect(err.message).toContain(`Model: ${mockAiModel}`);
                }
            });

            it('should log unexpected errors', async () => {
                const consoleSpyError = jest.spyOn(console, 'error').mockImplementation();
                const mockManager = {
                    findOne: jest.fn().mockRejectedValueOnce(new Error('DB error')),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                try {
                    await service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    );
                } catch (err) {
                    // Expected
                }

                expect(consoleSpyError).toHaveBeenCalled();
                consoleSpyError.mockRestore();
            });

            it('should handle errors without message property', async () => {
                const mockManager = {
                    findOne: jest.fn().mockRejectedValueOnce('string error'),
                };

                mockDataSource.transaction.mockImplementation(async (cb: any) =>
                    cb(mockManager as any),
                );

                await expect(
                    service.aiEvaluate(
                        mockSubmissionId,
                        mockFeedback,
                        mockScores,
                        mockInputTokens,
                        mockOutputTokens,
                        mockAiModel,
                    ),
                ).rejects.toThrow(InternalServerErrorException);
            });
        });
    });

    // =====================================================
    // handleAiModelInsufficient Tests
    // =====================================================
    describe('handleAiModelInsufficient', () => {
        const submissionId = '1';
        const rawMessage = 'Model API rate limit exceeded';

        it('should successfully disable AI key for user', async () => {
            const mockAiKey = { id: 1, isActive: true, isValid: true };
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: { id: mockUserId },
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);
            mockAiKeyRepository.findOne.mockResolvedValue(mockAiKey as any);
            mockAiKeyRepository.save.mockResolvedValue({ ...mockAiKey, isActive: false } as any);

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(mockAiKey.isActive).toBe(false);
            expect(mockAiKeyRepository.save).toHaveBeenCalledWith(mockAiKey);
        });

        it('should log warning when submission not found', async () => {
            mockSubmissionRepo.findOne.mockResolvedValue(null);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
        });

        it('should log warning when owner not found', async () => {
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: null,
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Owner not found'));
        });

        it('should log warning when owner id is missing', async () => {
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: { id: null },
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Owner not found'));
        });

        it('should fetch most recent active AI key', async () => {
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: { id: mockUserId },
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);
            mockAiKeyRepository.findOne.mockResolvedValue({ id: 1, isActive: true } as any);

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(mockAiKeyRepository.findOne).toHaveBeenCalledWith({
                where: { userId: mockUserId, isActive: true, isValid: true },
                order: { created_at: 'DESC' },
            });
        });

        it('should log warning when no active AI key found', async () => {
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: { id: mockUserId },
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);
            mockAiKeyRepository.findOne.mockResolvedValue(null);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('No active AI key found'),
            );
        });

        it('should log when AI key is disabled', async () => {
            const mockAiKey = { id: 'key-123', isActive: true, isValid: true };
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: {
                        owner: { id: mockUserId },
                    },
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);
            mockAiKeyRepository.findOne.mockResolvedValue(mockAiKey as any);
            mockAiKeyRepository.save.mockResolvedValue({ ...mockAiKey, isActive: false } as any);

            const loggerSpy = jest.spyOn(service['logger'], 'log');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('has been disabled'),
            );
        });

        it('should throw RpcException on error', async () => {
            mockSubmissionRepo.findOne.mockRejectedValue(new Error('Database error'));

            const loggerSpy = jest.spyOn(service['logger'], 'error');

            await expect(
                service.handleAiModelInsufficient(submissionId, rawMessage),
            ).rejects.toThrow();

            expect(loggerSpy).toHaveBeenCalled();
        });

        it('should handle Error instances in catch block', async () => {
            mockSubmissionRepo.findOne.mockRejectedValue(new Error('Test error'));

            const loggerSpy = jest.spyOn(service['logger'], 'error');

            await expect(
                service.handleAiModelInsufficient(submissionId, rawMessage),
            ).rejects.toThrow();

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Test error'),
            );
        });

        it('should handle non-Error objects in catch block', async () => {
            mockSubmissionRepo.findOne.mockRejectedValue('string error');

            const loggerSpy = jest.spyOn(service['logger'], 'error');

            await expect(
                service.handleAiModelInsufficient(submissionId, rawMessage),
            ).rejects.toThrow();

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Unknown error'),
            );
        });

        it('should handle missing assessment relation', async () => {
            const mockSubmission = {
                id: 1,
                assessment: null,
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Owner not found'));
        });

        it('should handle missing class relation', async () => {
            const mockSubmission = {
                id: 1,
                assessment: {
                    class: null,
                },
            };

            mockSubmissionRepo.findOne.mockResolvedValue(mockSubmission as any);

            const loggerSpy = jest.spyOn(service['logger'], 'warn');

            await service.handleAiModelInsufficient(submissionId, rawMessage);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Owner not found'));
        });
    });
});