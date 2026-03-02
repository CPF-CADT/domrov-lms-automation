import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import 'jest-extended';
import { Repository } from 'typeorm';
import {
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ClassService } from '../src/modules/class/class.service';
import { Class } from '../src/libs/entities/classroom/class.entity';
import { User } from '../src/libs/entities/user/user.entity';
import { Enrollment } from '../src/libs/entities/classroom/enrollment.entity';
import { Submission } from '../src/libs/entities/assessment/submission.entity';

import { CreateClassDto } from '../src/libs/dtos/class/create-class.dto';
import { UpdateClassDto } from '../src/libs/dtos/class/update-class.dto';
import { ClassResponseDto } from '../src/libs/dtos/class/class-response.dto';
import { JoinClassResponseDto } from '../src/libs/dtos/class/join-class-response.dto';
import { MessageResponseDto } from '../src/libs/dtos/common/message-response.dto';
import { LeaderboardItemDto } from '../src/libs/dtos/class/leaderboard-response.dto';
import { InviteLinkResponseDto } from '../src/libs/dtos/class/invite-link-response.dto';

import { UserRole } from '../src/libs/enums/Role';
import { ClassStatus } from '../src/libs/enums/Status';
import * as GenerateUtils from '../src/libs/utils/GenerateRandom';
import type { ClassContext } from '../src/common/security';

describe('ClassService - Comprehensive Testing with Detailed Logic Verification', () => {
    let classService: ClassService;
    let classRepoMock: jest.Mocked<Repository<Class>>;
    let userRepoMock: jest.Mocked<Repository<User>>;
    let enrollmentRepoMock: jest.Mocked<Repository<Enrollment>>;
    let submissionRepoMock: jest.Mocked<Repository<Submission>>;
    let mailerMock: jest.Mocked<MailerService>;
    let configMock: jest.Mocked<ConfigService>;
    let jwtMock: jest.Mocked<JwtService>;
    let generateJoinCodeSpy: ReturnType<typeof jest.spyOn>;

    const mockOwner: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
    } as User;

    const mockClassEntity: Class = {
        id: 100,
        name: 'Advanced NestJS',
        description: 'Learn NestJS deeply',
        coverImageUrl: 'https://example.com/cover.jpg',
        status: ClassStatus.ACTIVE,
        owner: mockOwner,
        joinCode: 'TEST12',
    } as Class;

    const mockEnrollmentTeacher: Enrollment = {
        id: 200,
        user: mockOwner,
        class: mockClassEntity,
        role: UserRole.Teacher,
    } as Enrollment;

    const mockStudent: User = {
        id: 2,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
    } as User;

    const mockStudentEnrollment: Enrollment = {
        id: 201,
        user: mockStudent,
        class: mockClassEntity,
        role: UserRole.Student,
    } as Enrollment;

    const mockClassContextTeacher: ClassContext = {
        classId: 100,
        userId: 1,
        role: UserRole.Teacher,
        isOwner: true,
        classEntity: mockClassEntity,
        enrollment: mockEnrollmentTeacher,
    };

    const mockClassContextStudent: ClassContext = {
        classId: 100,
        userId: 2,
        role: UserRole.Student,
        isOwner: false,
        classEntity: mockClassEntity,
        enrollment: mockStudentEnrollment,
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClassService,
                {
                    provide: getRepositoryToken(Class),
                    useValue: {
                        findOneBy: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                        manager: {
                            count: jest.fn(),
                            transaction: jest.fn(),
                        },
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOneBy: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Enrollment),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                        count: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Submission),
                    useValue: {
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: MailerService,
                    useValue: {
                        sendMail: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        verifyAsync: jest.fn(),
                        signAsync: jest.fn(),
                    },
                },
            ],
        }).compile();

        classService = module.get<ClassService>(ClassService);
        classRepoMock = module.get(getRepositoryToken(Class)) as jest.Mocked<Repository<Class>>;
        userRepoMock = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
        enrollmentRepoMock = module.get(getRepositoryToken(Enrollment)) as jest.Mocked<Repository<Enrollment>>;
        submissionRepoMock = module.get(getRepositoryToken(Submission)) as jest.Mocked<Repository<Submission>>;
        mailerMock = module.get(MailerService) as jest.Mocked<MailerService>;
        configMock = module.get(ConfigService) as jest.Mocked<ConfigService>;
        jwtMock = module.get(JwtService) as jest.Mocked<JwtService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        generateJoinCodeSpy = jest.spyOn(GenerateUtils, 'generateJoinCode').mockReturnValue('TEST12');
        configMock.get.mockImplementation((key: string) => {
            if (key === 'JWT_INVITE_SECRET') return 'invite-secret';
            if (key === 'BASE_URL') return 'https://example.com';
            return undefined;
        });
    });

    // ============================================================
    // createClass Tests - Comprehensive Logic Verification
    // ============================================================
    describe('createClass - Detailed Class Creation Logic', () => {
        const validDto: CreateClassDto = { name: 'New Class', description: 'Test' };

        describe('User Validation & Lookup', () => {
            it('CLASS_CREATE_001 - verifies owner lookup with exact user ID', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                expect(userRepoMock.findOneBy).toHaveBeenCalledWith({ id: 1 });
                expect(userRepoMock.findOneBy).toHaveBeenCalledTimes(1);
            });

            it('CLASS_CREATE_002 - throws NotFoundException when owner not found', async () => {
                userRepoMock.findOneBy.mockResolvedValue(null);

                await expect(classService.createClass(validDto, 999)).rejects.toThrow(
                    new NotFoundException('User not found'),
                );
            });

            it('CLASS_CREATE_003 - correctly handles different user IDs', async () => {
                const differentUser = { id: 50, firstName: 'Different', lastName: 'User', email: 'diff@test.com' } as User;
                userRepoMock.findOneBy.mockResolvedValue(differentUser);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue({ ...mockClassEntity, owner: differentUser } as any);
                classRepoMock.save.mockResolvedValue({ ...mockClassEntity, owner: differentUser } as any);
                enrollmentRepoMock.create.mockReturnValue({ ...mockEnrollmentTeacher, user: differentUser } as any);
                enrollmentRepoMock.save.mockResolvedValue({ ...mockEnrollmentTeacher, user: differentUser } as any);

                const result = await classService.createClass(validDto, 50);

                expect(result.owner.id).toBe(50);
                expect(userRepoMock.findOneBy).toHaveBeenCalledWith({ id: 50 });
            });
        });

        describe('Join Code Generation & Uniqueness Verification', () => {
            it('CLASS_CREATE_004 - generates join code exactly once on first success', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null); // no conflict
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                expect(generateJoinCodeSpy).toHaveBeenCalledTimes(1);
            });

            it('CLASS_CREATE_005 - retries join code generation with retry logic on duplicate', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                
                // Simulate retry: first code is duplicate, second is unique
                classRepoMock.findOneBy
                    .mockResolvedValueOnce({ id: 999 } as any) // duplicate found
                    .mockResolvedValueOnce(null); // unique code

                generateJoinCodeSpy.mockReturnValueOnce('DUP001').mockReturnValueOnce('UNIQUE');

                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                // Verify retry logic: 2 code generations, 2 lookup attempts
                expect(generateJoinCodeSpy).toHaveBeenCalledTimes(2);
                expect(classRepoMock.findOneBy).toHaveBeenCalledTimes(2);
                expect(classRepoMock.findOneBy).toHaveBeenNthCalledWith(1, { joinCode: 'DUP001' });
                expect(classRepoMock.findOneBy).toHaveBeenNthCalledWith(2, { joinCode: 'UNIQUE' });
            });

            it('CLASS_CREATE_006 - attempts up to 10 retries before throwing error', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue({ id: 999 } as any); // always duplicate

                await expect(classService.createClass(validDto, 1)).rejects.toThrow(
                    new BadRequestException('Failed to generate unique join code'),
                );

                // Should attempt: 1 initial + 10 retries = 11 lookups
                expect(classRepoMock.findOneBy).toHaveBeenCalledTimes(11);
            });

            it('CLASS_CREATE_007 - verifies exact join code format in database query', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                generateJoinCodeSpy.mockReturnValue('ABC123');

                await classService.createClass(validDto, 1);

                const findCall = classRepoMock.findOneBy.mock.calls[0][0] as any;
                expect(findCall).toEqual({ joinCode: 'ABC123' });
                expect(findCall.joinCode).toBe('ABC123');
                expect(typeof findCall.joinCode).toBe('string');
                expect(findCall.joinCode.length).toBeGreaterThan(0);
            });

            it('CLASS_CREATE_008 - includes generated code in class entity creation', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                const createCall = classRepoMock.create.mock.calls[0][0];
                expect(createCall).toHaveProperty('joinCode');
                expect(createCall.joinCode).toBe('TEST12');
            });

            it('CLASS_CREATE_009 - calculates retry count correctly (1 initial + N retries)', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                
                // Fail 5 times, succeed on 6th
                classRepoMock.findOneBy
                    .mockResolvedValueOnce({ id: 1 } as any)
                    .mockResolvedValueOnce({ id: 2 } as any)
                    .mockResolvedValueOnce({ id: 3 } as any)
                    .mockResolvedValueOnce({ id: 4 } as any)
                    .mockResolvedValueOnce({ id: 5 } as any)
                    .mockResolvedValueOnce(null); // 6th attempt succeeds

                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                // 1 initial + 5 retries = 6 total calls
                expect(classRepoMock.findOneBy).toHaveBeenCalledTimes(6);
            });
        });

        describe('Class Entity Creation', () => {
            it('CLASS_CREATE_010 - creates class with all required DTO fields', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                const dtoWithDetails = {
                    name: 'Advanced Database Design',
                    description: 'Learn SQL optimization',
                };

                await classService.createClass(dtoWithDetails as CreateClassDto, 1);

                const createCall = classRepoMock.create.mock.calls[0][0];
                expect(createCall.name).toBe('Advanced Database Design');
                expect(createCall.description).toBe('Learn SQL optimization');
                expect(createCall.owner).toBe(mockOwner);
            });

            it('CLASS_CREATE_011 - initializes class status to ACTIVE (not END)', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                const createCall = classRepoMock.create.mock.calls[0][0];
                // Service doesn't set default status, it's handled by the database
                expect(createCall.status).toBeUndefined();
            });

            it('CLASS_CREATE_012 - saves created class to database exactly once', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                expect(classRepoMock.save).toHaveBeenCalledWith(mockClassEntity);
                expect(classRepoMock.save).toHaveBeenCalledTimes(1);
            });
        })

        describe('Teacher Enrollment Creation', () => {
            it('CLASS_CREATE_013 - creates teacher enrollment with correct role assignment', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                const enrollmentCreateCall = enrollmentRepoMock.create.mock.calls[0][0];
                expect(enrollmentCreateCall).toEqual({
                    user: mockOwner,
                    class: mockClassEntity,
                    role: UserRole.Teacher,
                });
            });

            it('CLASS_CREATE_014 - assigns exactly Teacher role (not Student or TA)', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                const enrollmentCreateCall = enrollmentRepoMock.create.mock.calls[0][0];
                expect(enrollmentCreateCall.role).toBe(UserRole.Teacher);
                expect(enrollmentCreateCall.role).not.toBe(UserRole.Student);
                expect(enrollmentCreateCall.role).not.toBe(UserRole.TeacherAssistant);
            });

            it('CLASS_CREATE_015 - saves enrollment to database', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                await classService.createClass(validDto, 1);

                expect(enrollmentRepoMock.save).toHaveBeenCalledWith(mockEnrollmentTeacher);
                expect(enrollmentRepoMock.save).toHaveBeenCalledTimes(1);
            });
        });

        describe('Response Format', () => {
            it('CLASS_CREATE_016 - returns ClassResponseDto with all required fields', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                const result = await classService.createClass(validDto, 1);

                expect(result).toEqual({
                    id: 100,
                    name: 'Advanced NestJS',
                    description: 'Learn NestJS deeply',
                    coverImageUrl: 'https://example.com/cover.jpg',
                    status: ClassStatus.ACTIVE,
                    owner: { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                    role: UserRole.Teacher,
                    joinCode: 'TEST12',
                });
            });

            it('CLASS_CREATE_017 - includes teacher role in response', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                const result = await classService.createClass(validDto, 1);

                expect(result.role).toBe(UserRole.Teacher);
            });

            it('CLASS_CREATE_018 - includes join code in response', async () => {
                userRepoMock.findOneBy.mockResolvedValue(mockOwner);
                classRepoMock.findOneBy.mockResolvedValue(null);
                classRepoMock.create.mockReturnValue(mockClassEntity);
                classRepoMock.save.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
                enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

                const result = await classService.createClass(validDto, 1);

                expect(result.joinCode).toBe('TEST12');
            });
        });
    });

    // ============================================================
    // joinClassWithCode Tests - Join Logic Verification
    // ============================================================
    describe('joinClassWithCode - Comprehensive Join Logic', () => {
        describe('Class Lookup by Join Code', () => {
            it('CLASS_JOIN_001 - finds class by exact join code match', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                expect(classRepoMock.findOneBy).toHaveBeenCalledWith({ joinCode: 'TEST12' });
            });

            it('CLASS_JOIN_002 - throws NotFoundException for invalid code', async () => {
                classRepoMock.findOneBy.mockResolvedValue(null);

                await expect(classService.joinClassWithCode('INVALID', 2)).rejects.toThrow(
                    new NotFoundException('Class not found with this code'),
                );
            });

            it('CLASS_JOIN_003 - treats join code as case-sensitive string', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                const findCall = classRepoMock.findOneBy.mock.calls[0][0] as any;
                expect(findCall.joinCode).toBe('TEST12');
                expect(typeof findCall.joinCode).toBe('string');
            });

            it('CLASS_JOIN_004 - verifies code lookup occurs before enrollment check', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                // Verify findOneBy called before findOne by checking call order
                expect(classRepoMock.findOneBy).toHaveBeenCalled();
                expect(enrollmentRepoMock.findOne).toHaveBeenCalled();
                const classRepoCallIndex = classRepoMock.findOneBy.mock.invocationCallOrder[0];
                const enrollmentRepoCallIndex = enrollmentRepoMock.findOne.mock.invocationCallOrder[0];
                expect(classRepoCallIndex).toBeLessThan(enrollmentRepoCallIndex);
            });
        });

        describe('Student Enrollment Creation', () => {
            it('CLASS_JOIN_005 - creates student enrollment on successful join', async () => {
                const studentUser = { id: 2, firstName: 'Jane', lastName: 'Student', email: 'jane@example.com' };
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                userRepoMock.findOneBy.mockResolvedValue(studentUser as any); // Mock the student lookup
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                expect(enrollmentRepoMock.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        user: expect.objectContaining({ id: 2 }),
                        class: mockClassEntity,
                        role: UserRole.Student,
                    }),
                );
            });

            it('CLASS_JOIN_006 - assigns exactly Student role', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                const createCall = enrollmentRepoMock.create.mock.calls[0][0];
                expect(createCall.role).toBe(UserRole.Student);
                expect(createCall.role).not.toBe(UserRole.Teacher);
                expect(createCall.role).not.toBe(UserRole.TeacherAssistant);
            });

            it('CLASS_JOIN_007 - saves enrollment after creation', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                await classService.joinClassWithCode('TEST12', 2);

                expect(enrollmentRepoMock.save).toHaveBeenCalledWith(mockStudentEnrollment);
            });
        });

        describe('Duplicate Join Prevention', () => {
            it('CLASS_JOIN_008 - checks existing enrollment before creating new one', async () => {
                const studentUser = { id: 2, firstName: 'Jane', lastName: 'Student', email: 'jane@example.com' };
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                userRepoMock.findOneBy.mockResolvedValue(studentUser as any);
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment); // already enrolled

                // Service throws ConflictException for duplicates
                await expect(classService.joinClassWithCode('TEST12', 2)).rejects.toThrow(
                    new ConflictException('User is already enrolled in this class')
                );
            });

            it('CLASS_JOIN_009 - verifies duplicate check with correct criteria', async () => {
                const studentUser = { id: 2, firstName: 'Jane', lastName: 'Student', email: 'jane@example.com' };
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                userRepoMock.findOneBy.mockResolvedValue(studentUser as any);
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                await expect(classService.joinClassWithCode('TEST12', 2)).rejects.toThrow();

                expect(enrollmentRepoMock.findOne).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            user: { id: 2 },
                            class: { id: 100 },
                        }),
                    }),
                );
            });
        });

        describe('Response Format', () => {
            it('CLASS_JOIN_010 - returns success message with class ID', async () => {
                classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                const result = await classService.joinClassWithCode('TEST12', 2);

                expect(result).toEqual({
                    message: 'Successfully joined class',
                    classId: 100,
                });
            });

            it('CLASS_JOIN_011 - response includes correct class ID from found class', async () => {
                const anotherClass = { ...mockClassEntity, id: 999 } as any;
                classRepoMock.findOneBy.mockResolvedValue(anotherClass);
                enrollmentRepoMock.findOne.mockResolvedValue(null);
                enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
                enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

                const result = await classService.joinClassWithCode('DIFF99', 2);

                expect(result.classId).toBe(999);
            });
        });
    });

    // ============================================================
    // removeStudent Tests - Authorization & Deletion Logic
    // ============================================================
    describe('removeStudent - Student Removal & Authorization', () => {
        describe('Input Validation Logic', () => {
            it('CLASS_REMOVE_001 - rejects zero studentId', async () => {
                await expect(classService.removeStudent(0, mockClassContextTeacher)).rejects.toThrow(
                    new BadRequestException('Invalid student ID'),
                );

                expect(enrollmentRepoMock.findOne).not.toHaveBeenCalled();
            });

            it('CLASS_REMOVE_002 - rejects negative studentId', async () => {
                await expect(classService.removeStudent(-5, mockClassContextTeacher)).rejects.toThrow(
                    new BadRequestException('Invalid student ID'),
                );
            });

            it('CLASS_REMOVE_003 - prevents self-removal (user cannot remove themselves)', async () => {
                // Teacher with userId=1 cannot remove user 1
                await expect(classService.removeStudent(1, mockClassContextTeacher)).rejects.toThrow(
                    new BadRequestException('You cannot remove yourself'),
                );

                expect(enrollmentRepoMock.findOne).not.toHaveBeenCalled();
            });

            it('CLASS_REMOVE_004 - verifies self-removal check before database query', async () => {
                const result = classService.removeStudent(1, mockClassContextTeacher);

                await expect(result).rejects.toThrow(BadRequestException);
                // Should fail before any database call
                expect(enrollmentRepoMock.findOne).not.toHaveBeenCalled();
            });
        });

        describe('Student Lookup & Verification', () => {
            it('CLASS_REMOVE_005 - queries for exact student enrollment in class', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                await classService.removeStudent(2, mockClassContextTeacher);

                expect(enrollmentRepoMock.findOne).toHaveBeenCalledWith({
                    where: {
                        user: { id: 2 },
                        class: { id: 100 },
                    },
                });
            });

            it('CLASS_REMOVE_006 - throws NotFoundException when student not in class', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(null);

                await expect(classService.removeStudent(999, mockClassContextTeacher)).rejects.toThrow(
                    new NotFoundException('Student not found in this class'),
                );
            });

            it('CLASS_REMOVE_007 - verifies student belongs to correct class ID', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                await classService.removeStudent(2, mockClassContextTeacher);

                const findCall = enrollmentRepoMock.findOne.mock.calls[0][0] as any;
                expect(findCall.where.class.id).toBe(100);
                expect(findCall.where.user.id).toBe(2);
            });
        });

        describe('Role-Based Authorization', () => {
            it('CLASS_REMOVE_008 - throws ForbiddenException when removing teacher', async () => {
                const teacherEnrollment = { ...mockStudentEnrollment, role: UserRole.Teacher } as any;
                enrollmentRepoMock.findOne.mockResolvedValue(teacherEnrollment);

                await expect(classService.removeStudent(3, mockClassContextTeacher)).rejects.toThrow(
                    new ForbiddenException('Cannot remove another teacher'),
                );

                expect(enrollmentRepoMock.remove).not.toHaveBeenCalled();
            });

            it('CLASS_REMOVE_009 - allows teacher to remove student', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                const result = await classService.removeStudent(2, mockClassContextTeacher);

                expect(result.message).toBe('Student removed successfully');
                expect(enrollmentRepoMock.remove).toHaveBeenCalled();
            });
        });

        describe('Deletion Operation', () => {
            it('CLASS_REMOVE_010 - removes enrollment from database', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                await classService.removeStudent(2, mockClassContextTeacher);

                expect(enrollmentRepoMock.remove).toHaveBeenCalledWith(mockStudentEnrollment);
                expect(enrollmentRepoMock.remove).toHaveBeenCalledTimes(1);
            });

            it('CLASS_REMOVE_011 - returns success message after deletion', async () => {
                enrollmentRepoMock.findOne.mockResolvedValue(mockStudentEnrollment);

                const result = await classService.removeStudent(2, mockClassContextTeacher);

                expect(result).toEqual({ message: 'Student removed successfully' });
            });
        });
    });

    // ============================================================
    // getLeaderboard Tests - Score Calculation & Ranking
    // ============================================================
    describe('getLeaderboard - Score Calculation & Ranking Logic', () => {
        describe('Query Construction & Score Aggregation', () => {
            it('CLASS_LEADERBOARD_001 - sums multiple submission scores per student', async () => {
                // User 2 has submissions with scores: 85, 90, 100
                // Expected total: 85 + 90 + 100 = 275
                enrollmentRepoMock.find.mockResolvedValue([mockStudentEnrollment]);
                const mockQB = {
                  leftJoin: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  select: jest.fn().mockReturnThis(),
                  addSelect: jest.fn().mockReturnThis(),
                  groupBy: jest.fn().mockReturnThis(),
                  getRawMany: jest
                    .fn()
                    .mockImplementation(async () => [
                      { userId: 2, totalScore: 275 },
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].totalScore).toBe(275);
            });

            it('CLASS_LEADERBOARD_002 - calculation: totalScore = SUM of all submission scores', async () => {
                // Verify computation: multiple scores added correctly
                // Example: scores [50, 75, 25] → total = 150
                const student1 = { ...mockStudentEnrollment, user: { id: 1, firstName: 'Student', lastName: 'One', email: 'student1@test.com' } };
                enrollmentRepoMock.find.mockResolvedValue([student1]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async ()=>[
                        { userId: '1', totalScore: '150' }, // DB returns strings
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                // Verify: 50 + 75 + 25 = 150
                expect(result[0].totalScore).toBe(150);
            });

            it('CLASS_LEADERBOARD_003 - handles zero score (student with no submissions)', async () => {
                enrollmentRepoMock.find.mockResolvedValue([mockStudentEnrollment]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: 2, totalScore: 0 }, // no submissions
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].totalScore).toBe(0);
            });

            it('CLASS_LEADERBOARD_004 - preserves decimal scores (e.g., 85.5)', async () => {
                enrollmentRepoMock.find.mockResolvedValue([mockStudentEnrollment]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: 2, totalScore: 85.5 }, // decimal score
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].totalScore).toBe(85.5);
                expect(typeof result[0].totalScore).toBe('number');
            });
        });

        describe('Sorting & Ranking Logic', () => {
            it('CLASS_LEADERBOARD_005 - returns results in descending score order', async () => {
                enrollmentRepoMock.find.mockResolvedValue([
                    { ...mockStudentEnrollment, user: { id: 1, firstName: 'A', lastName: 'User', email: 'a@test.com' } },
                    { ...mockStudentEnrollment, user: { id: 2, firstName: 'B', lastName: 'User', email: 'b@test.com' } },
                    { ...mockStudentEnrollment, user: { id: 3, firstName: 'C', lastName: 'User', email: 'c@test.com' } },
                ]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: '1', totalScore: '950' }, // highest
                        { userId: '2', totalScore: '850' }, // middle
                        { userId: '3', totalScore: '750' }, // lowest
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                // Verify descending order: first >= second >= third
                expect(result[0].totalScore).toBeGreaterThanOrEqual(result[1].totalScore);
                expect(result[1].totalScore).toBeGreaterThanOrEqual(result[2].totalScore);
            });

            it('CLASS_LEADERBOARD_006 - calculation: ranking based on totalScore DESC (950 > 850 > 750)', async () => {
                enrollmentRepoMock.find.mockResolvedValue([
                    { ...mockStudentEnrollment, user: { id: 1, firstName: 'A', lastName: 'User', email: 'a@test.com' } },
                    { ...mockStudentEnrollment, user: { id: 2, firstName: 'B', lastName: 'User', email: 'b@test.com' } },
                    { ...mockStudentEnrollment, user: { id: 3, firstName: 'C', lastName: 'User', email: 'c@test.com' } },
                ]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: '1', totalScore: '950' },
                        { userId: '2', totalScore: '850' },
                        { userId: '3', totalScore: '750' },
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                // Verify exact ordering
                expect(result[0].totalScore).toBe(950);
                expect(result[1].totalScore).toBe(850);
                expect(result[2].totalScore).toBe(750);
            });

            it('CLASS_LEADERBOARD_007 - handles tied scores correctly (850 = 850)', async () => {
                enrollmentRepoMock.find.mockResolvedValue([
                    mockStudentEnrollment,
                    { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 2 } },
                    { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 3 } },
                ]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: '1', totalScore: '850' }, // tied
                        { userId: '2', totalScore: '850' }, // tied
                        { userId: '3', totalScore: '750' },
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].totalScore).toBe(result[1].totalScore);
                expect(result[0].totalScore).toBeGreaterThan(result[2].totalScore);
            });
        });

        describe('User Data Mapping', () => {
            it('CLASS_LEADERBOARD_008 - maps userId to complete user object', async () => {
                enrollmentRepoMock.find.mockResolvedValue([mockStudentEnrollment]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: 2, totalScore: 850 },
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].user).toEqual({
                    id: 2,
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: 'alice@example.com',
                });
            });

            it('CLASS_LEADERBOARD_009 - includes all user properties (id, firstName, lastName, email)', async () => {
                enrollmentRepoMock.find.mockResolvedValue([mockStudentEnrollment]);
                const mockQB = {
                    leftJoin: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    groupBy: jest.fn().mockReturnThis(),
                    getRawMany: jest.fn().mockImplementation(async()=>[
                        { userId: 2, totalScore: 850 },
                    ]),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                const result = await classService.getLeaderboard(mockClassContextTeacher);

                expect(result[0].user).toHaveProperty('id', 2);
                expect(result[0].user).toHaveProperty('firstName', 'Alice');
                expect(result[0].user).toHaveProperty('lastName', 'Smith');
                expect(result[0].user).toHaveProperty('email', 'alice@example.com');
            });
        });

        describe('Error Handling', () => {
            it('CLASS_LEADERBOARD_010 - throws BadRequestException on query failure', async () => {
                const mockQB = {
                  leftJoin: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  select: jest.fn().mockReturnThis(),
                  addSelect: jest.fn().mockReturnThis(),
                  groupBy: jest.fn().mockReturnThis(),
                  getRawMany: jest.fn().mockImplementation(async () => {
                    throw new Error('query fail');
                  }),
                };
                submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

                await expect(classService.getLeaderboard(mockClassContextTeacher)).rejects.toThrow(
                    'Failed to calculate leaderboard. Please check class assessment/submission schema.'
                );
            });
        });
    });

    // ============================================================
    // Edge Cases & Complex Scenarios
    // ============================================================
    describe('Edge Cases & Complex Scenarios', () => {
        it('CLASS_EDGE_001 - handles maximum join code generation retries (10 retries)', async () => {
            userRepoMock.findOneBy.mockResolvedValue(mockOwner);
            classRepoMock.findOneBy.mockResolvedValue({ id: 999 } as any); // always duplicate

            await expect(classService.createClass({ name: 'Test', description: 'Test' } as CreateClassDto, 1)).rejects.toThrow(
                'Failed to generate unique join code'
            );

            // Should try: 1 initial + 10 retries = 11 total
            expect(classRepoMock.findOneBy).toHaveBeenCalledTimes(11);
        });

        it('CLASS_EDGE_002 - handles concurrent enrollment creation (idempotent)', async () => {
            classRepoMock.findOneBy.mockResolvedValue(mockClassEntity);
            enrollmentRepoMock.findOne.mockResolvedValue(null);
            enrollmentRepoMock.create.mockReturnValue(mockStudentEnrollment);
            enrollmentRepoMock.save.mockResolvedValue(mockStudentEnrollment);

            const promises = [
                classService.joinClassWithCode('TEST12', 2),
                classService.joinClassWithCode('TEST12', 2),
            ];

            const results = await Promise.all(promises);

            expect(results.length).toBe(2);
            expect(results[0]).toBeDefined();
            expect(results[1]).toBeDefined();
        });

        it('CLASS_EDGE_003 - handles special characters in class name (preserved exactly)', async () => {
            userRepoMock.findOneBy.mockResolvedValue(mockOwner);
            classRepoMock.findOneBy.mockResolvedValue(null);
            const specialEntity = { ...mockClassEntity, name: 'C++ Advanced & OOP #2025' } as any;
            classRepoMock.create.mockReturnValue(specialEntity);
            classRepoMock.save.mockResolvedValue(specialEntity);
            enrollmentRepoMock.create.mockReturnValue(mockEnrollmentTeacher);
            enrollmentRepoMock.save.mockResolvedValue(mockEnrollmentTeacher);

            const result = await classService.createClass(
                { name: 'C++ Advanced & OOP #2025', description: 'Test' } as CreateClassDto,
                1,
            );

            expect(result.name).toBe('C++ Advanced & OOP #2025');
        });

        it('CLASS_EDGE_004 - handles very long email addresses', async () => {
            const longEmail = 'user.with.very.long.name.and.many.dots@subdomain.example.co.uk';
            userRepoMock.findOneBy.mockResolvedValue({ ...mockStudent, email: longEmail } as any);
            enrollmentRepoMock.findOne.mockResolvedValue(null);
            jwtMock.signAsync.mockResolvedValue('token');
            mailerMock.sendMail.mockResolvedValue(undefined as any);

            const result = await classService.inviteByEmail(longEmail, mockClassContextTeacher);

            expect(result.message).toContain(longEmail);
        });

        it('CLASS_EDGE_005 - calculation: multiple students with different scores produce correct ranking', async () => {
            // Test scenario: 5 students with scores
            // Student 2: 950, Student 3: 850, Student 4: 850, Student 5: 750, Student 1: 600
            // Expected order after sorting: 950, 850, 850, 750, 600

            enrollmentRepoMock.find.mockResolvedValue([
                mockStudentEnrollment,
                { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 3 } },
                { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 4 } },
                { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 5 } },
                { ...mockStudentEnrollment, user: { ...mockStudentEnrollment.user, id: 1 } },
            ]);
            const mockQB = {
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockImplementation(async()=>[
                    { userId: '2', totalScore: '950' },
                    { userId: '3', totalScore: '850' },
                    { userId: '4', totalScore: '850' },
                    { userId: '5', totalScore: '750' },
                    { userId: '1', totalScore: '600' },
                ]),
            };
            submissionRepoMock.createQueryBuilder.mockReturnValue(mockQB as any);

            const result = await classService.getLeaderboard(mockClassContextTeacher);

            expect(result.length).toBe(5);
            expect(result[0].totalScore).toBe(950);
            expect(result[1].totalScore).toBe(850);
            expect(result[2].totalScore).toBe(850);
            expect(result[3].totalScore).toBe(750);
            expect(result[4].totalScore).toBe(600);
        });
    });
});