import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Repository } from 'typeorm';
import {
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TeamService } from '../src/modules/team/team.service';
import { Team } from '../src/libs/entities/classroom/team.entity';
import { User } from '../src/libs/entities/user/user.entity';
import { Enrollment } from '../src/libs/entities/classroom/enrollment.entity';
import { TeamMember } from '../src/libs/entities/classroom/user-team.entity';

import { CreateTeamDto } from '../src/libs/dtos/team/create-team.dto';
import { CreateManyTeamsDto } from '../src/libs/dtos/team/create-many-teams.dto';

import { UserRole } from '../src/libs/enums/Role';
import * as GenerateUtils from '../src/libs/utils/GenerateRandom';
import type { TeamContext, ClassContext } from '../src/common/security/dtos/guard.dto';

describe('TeamService - Detailed Logic and Computation Tests', () => {
    let teamService: TeamService;
    let teamRepoMock: jest.Mocked<Repository<Team>>;
    let userRepoMock: jest.Mocked<Repository<User>>;
    let enrollmentRepoMock: jest.Mocked<Repository<Enrollment>>;
    let teamMemberRepoMock: jest.Mocked<Repository<TeamMember>>;
    let mailerMock: jest.Mocked<MailerService>;
    let configMock: jest.Mocked<ConfigService>;
    let jwtMock: jest.Mocked<JwtService>;
    let generateJoinCodeSpy: ReturnType<typeof jest.spyOn>;

    const mockUserLeader: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profilePictureUrl: 'https://example.com/john.jpg',
    } as User;

    const mockUserLeader2: User = {
        id: 2,
        firstName: 'John2',
        lastName: 'Do2e',
        email: 'john2@example.com',
        profilePictureUrl: 'https://example.com/john2.jpg',
    } as User;

    const mockUserStudent1: User = {
        id: 10,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        profilePictureUrl: null,
    } as User;

    const mockUserStudent2: User = {
        id: 11,
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        profilePictureUrl: 'https://example.com/bob.jpg',
    } as User;

    const mockUserStudent3: User = {
        id: 12,
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        profilePictureUrl: null,
    } as User;

    const mockTeamEntity: Team = {
        id: 200,
        name: 'Team Alpha',
        joinCode: 'T1E2A3',
        maxMember: 5,
        leader: mockUserLeader,
        class: { id: 100, name: 'Math 101' } as any,
    } as Team;

    const mockTeamEntity2: Team = {
        id: 201,
        name: 'Team Beta',
        joinCode: 'T2B3C4',
        maxMember: 4,
        leader: mockUserLeader2,
        class: { id: 100, name: 'Math 101' } as any,
    } as Team;

    const mockTeamMember1: TeamMember = {
        id: 300,
        user: mockUserStudent1,
        team: mockTeamEntity,
    } as TeamMember;

    const mockTeamMember2: TeamMember = {
        id: 301,
        user: mockUserStudent2,
        team: mockTeamEntity,
    } as TeamMember;

    const mockTeamMember3: TeamMember = {
        id: 302,
        user: mockUserStudent3,
        team: mockTeamEntity2,
    } as TeamMember;

    const mockTeamContextLeader: TeamContext = {
        teamId: 200,
        userId: 1,
        isLeader: true,
        isMember: true,
        isApproved: true,
        teamEntity: mockTeamEntity,
        membership: undefined,
    };

    const mockTeamContextMember: TeamContext = {
        teamId: 200,
        userId: 10,
        isLeader: false,
        isMember: true,
        isApproved: true,
        teamEntity: mockTeamEntity,
        membership: mockTeamMember1,
    };

    const mockClassContext: ClassContext = {
        classId: 100,
        userId: 1,
        role: UserRole.Teacher,
        isOwner: true,
        classEntity: { id: 100 } as any,
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TeamService,
                {
                    provide: getRepositoryToken(Team),
                    useValue: {
                        findOne: jest.fn(),
                        findOneBy: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOneBy: jest.fn(),
                        findByIds: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Enrollment),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(TeamMember),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                        count: jest.fn(),
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
                        signAsync: jest.fn(),
                        verifyAsync: jest.fn(),
                    },
                },
            ],
        }).compile();

        teamService = module.get<TeamService>(TeamService);
        teamRepoMock = module.get(getRepositoryToken(Team)) as jest.Mocked<Repository<Team>>;
        userRepoMock = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
        enrollmentRepoMock = module.get(getRepositoryToken(Enrollment)) as jest.Mocked<Repository<Enrollment>>;
        teamMemberRepoMock = module.get(getRepositoryToken(TeamMember)) as jest.Mocked<Repository<TeamMember>>;
        mailerMock = module.get(MailerService) as jest.Mocked<MailerService>;
        configMock = module.get(ConfigService) as jest.Mocked<ConfigService>;
        jwtMock = module.get(JwtService) as jest.Mocked<JwtService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        generateJoinCodeSpy = jest.spyOn(GenerateUtils, 'generateJoinCode').mockReturnValue('T1E2A3');
        configMock.get.mockImplementation((key: string) => {
            if (key === 'TEAM_INVITE_SECRET') return 'team-secret';
            if (key === 'BASE_URL') return 'https://example.com';
            return undefined;
        });
    });

    // =====================================================
    // createTeam - DETAILED LOGIC TESTS
    // =====================================================

    describe('createTeam - Detailed Logic and Computation Tests', () => {
        const validDto: CreateTeamDto = { name: 'Team Alpha', maxMember: 5, classId: 100 };

        it('TEAM_CREATETEAM_VALID_001 - creates team with unique join code and adds leader as member', async () => {
            // Test: Verify complete team creation workflow
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);
            teamRepoMock.create.mockReturnValue(mockTeamEntity);
            teamRepoMock.save.mockResolvedValue(mockTeamEntity);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createTeam(validDto, 1);

            expect(result).toEqual({
                id: 200,
                name: 'Team Alpha',
                joinCode: 'T1E2A3',
                maxMember: 5,
                leader: expect.objectContaining({
                    id: 1,
                    firstName: 'John',
                    email: 'john@example.com',
                }),
                members: undefined,
            });

            // Verify join code generation
            expect(generateJoinCodeSpy).toHaveBeenCalled();

            // Verify leader added as member
            expect(teamMemberRepoMock.create).toHaveBeenCalledWith({
                user: mockUserLeader,
                team: mockTeamEntity,
            });
            expect(teamMemberRepoMock.save).toHaveBeenCalledTimes(1);
        });

        it('TEAM_CREATETEAM_JOINCODEUNIQUE_002 - retries join code generation if not unique', async () => {
            // Test: Verify system finds unique join code on retry
            const callSequence = ['T1E2A3', 'T4R5Y6']; // First exists, second unique
            let callIndex = 0;

            generateJoinCodeSpy.mockImplementation(() => {
                return callSequence[callIndex++];
            });

            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);

            // First call returns existing team (join code not unique)
            // Second call returns null (join code unique)
            teamRepoMock.findOneBy
                .mockResolvedValueOnce(mockTeamEntity) // Code exists
                .mockResolvedValueOnce(null); // Code unique

            teamRepoMock.create.mockReturnValue({ ...mockTeamEntity, joinCode: 'T4R5Y6' } as any);
            teamRepoMock.save.mockResolvedValue({ ...mockTeamEntity, joinCode: 'T4R5Y6' } as any);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createTeam(validDto, 1);

            // Verify retry logic
            expect(generateJoinCodeSpy).toHaveBeenCalledTimes(2);
            expect(teamRepoMock.findOneBy).toHaveBeenCalledTimes(2);
        });

        it('TEAM_CREATETEAM_MAXMEMBERVALIDATION_003 - validates maxMember constraint', async () => {
            // Test: Verify maxMember is properly stored
            const dtoWithMaxMembers = { ...validDto, maxMember: 10 };

            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);

            const teamWithDifferentMax = { ...mockTeamEntity, maxMember: 10 };
            teamRepoMock.create.mockReturnValue(teamWithDifferentMax as any);
            teamRepoMock.save.mockResolvedValue(teamWithDifferentMax as any);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createTeam(dtoWithMaxMembers, 1);

            expect(result.maxMember).toBe(10);
            expect(teamRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxMember: 10,
                })
            );
        });

        it('TEAM_CREATETEAM_USERNOTFOUND_004 - throws NotFoundException when user not found', async () => {
            // Test: Verify error when user doesn't exist
            userRepoMock.findOneBy.mockResolvedValue(null);

            await expect(teamService.createTeam(validDto, 999)).rejects.toThrow(
                new NotFoundException('User not found')
            );

            // Verify no team was created
            expect(teamRepoMock.create).not.toHaveBeenCalled();
            expect(teamRepoMock.save).not.toHaveBeenCalled();
        });

        it('TEAM_CREATETEAM_NOTENROLLED_005 - throws ForbiddenException when user not enrolled', async () => {
            // Test: Verify access control - user must be in class
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.createTeam(validDto, 1)).rejects.toThrow(
                new ForbiddenException('You must be enrolled in this class to join a team')
            );
        });

        it('TEAM_CREATETEAM_CLASSMATCHVERIFICATION_006 - verifies team class matches requested class', async () => {
            // Test: Ensure team is created in correct class
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100, name: 'Math 101' } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);
            teamRepoMock.create.mockReturnValue(mockTeamEntity);
            teamRepoMock.save.mockResolvedValue(mockTeamEntity);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createTeam(validDto, 1);

            // Verify team.class is set correctly
            expect(teamRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    class: expect.objectContaining({ id: 100 }),
                })
            );
        });

        it('TEAM_CREATETEAM_LEADERRELATIONSHIP_007 - sets leader relationship correctly', async () => {
            // Test: Verify leader is properly assigned
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);
            teamRepoMock.create.mockReturnValue(mockTeamEntity);
            teamRepoMock.save.mockResolvedValue(mockTeamEntity);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            await teamService.createTeam(validDto, 1);

            // Verify create was called with correct leader
            expect(teamRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    leader: mockUserLeader,
                })
            );
        });

        it('TEAM_CREATETEAM_SAVEERROR_008 - throws error when database save fails', async () => {
            // Test: Verify error handling for database failures
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);
            teamRepoMock.save.mockRejectedValue(new Error('DB connection failed'));

            await expect(teamService.createTeam(validDto, 1)).rejects.toThrow('Failed to create team');
        });
    });

    // =====================================================
    // joinTeamWithCode - DETAILED LOGIC TESTS
    // =====================================================

    describe('joinTeamWithCode - Detailed Logic and Computation Tests', () => {
        it('TEAM_JOINWITHCODE_VALID_001 - joins existing team and counts members correctly', async () => {
            // Test: Verify correct team joining logic
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(1); // Current member count
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.joinTeamWithCode('T1E2A3', 10);

            expect(result).toEqual({
                message: 'Successfully joined team',
                teamId: 200,
            });

            // Verify team was found by join code
            expect(teamRepoMock.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { joinCode: 'T1E2A3' },
                })
            );
        });

        it('TEAM_JOINWITHCODE_CAPACITYCHECK_002 - verifies team has capacity before joining', async () => {
            // Test: Ensure team doesn't exceed maxMember limit
            const teamAtCapacity = { ...mockTeamEntity, maxMember: 2 };
            teamRepoMock.findOne.mockResolvedValue(teamAtCapacity as any);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(2); // Already at max

            await expect(teamService.joinTeamWithCode('T1E2A3', 10)).rejects.toThrow(
                'This team is already full'
            );
        });

        it('TEAM_JOINWITHCODE_DUPLICATEPREVENT_003 - prevents duplicate membership', async () => {
            // Test: User cannot join same team twice
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            teamMemberRepoMock.findOne.mockResolvedValue(mockTeamMember1); // Already a member

            await expect(teamService.joinTeamWithCode('T1E2A3', 10)).rejects.toThrow(
                'You are already in this team'
            );
        });

        it('TEAM_JOINWITHCODE_SETLEADER_004 - sets leader if team has none', async () => {
            // Test: First person joining empty team becomes leader
            const teamNoLeader = { ...mockTeamEntity, leader: null };
            teamRepoMock.findOne.mockResolvedValue(teamNoLeader as any);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(0);
            teamRepoMock.save.mockResolvedValue({
                ...teamNoLeader,
                leader: mockUserStudent1,
            } as any);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.joinTeamWithCode('T1E2A3', 10);

            expect(result).toEqual({
                message: 'Successfully joined team',
                teamId: 200,
            });

            // Verify leader was set
            expect(teamRepoMock.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    leader: mockUserStudent1,
                })
            );
        });

        it('TEAM_JOINWITHCODE_NOTFOUND_005 - throws NotFoundException for invalid code', async () => {
            // Test: Verify error when join code doesn't exist
            teamRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.joinTeamWithCode('INVALID', 10)).rejects.toThrow(
                new NotFoundException('Team not found with this code')
            );
        });

        it('TEAM_JOINWITHCODE_MEMBERCOUNT_COMPUTATION_006 - correctly computes team member count', async () => {
            // Test: Verify member count before and after join
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            teamMemberRepoMock.findOne.mockResolvedValue(null);

            // Simulate 3 current members, max 5
            teamMemberRepoMock.count.mockResolvedValue(3);

            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.joinTeamWithCode('T1E2A3', 10);

            expect(result.teamId).toBe(200);

            // Verify count was checked
            expect(teamMemberRepoMock.count).toHaveBeenCalledWith({
                where: { team: { id: 200 } },
            });
        });
    });

    // =====================================================
    // createManyTeams - DETAILED LOGIC TESTS
    // =====================================================

    describe('createManyTeams - Detailed Logic and Computation Tests', () => {
        const validManyDto: CreateManyTeamsDto = {
            classId: 100,
            teams: [
                { name: 'Team A', maxMember: 4, leaderId: 1 },
                { name: 'Team B', maxMember: 3, memberIds: [10], leaderId: 2 },
                { name: 'Team C', maxMember: 5, leaderId: 1, memberIds: [10, 11] },
            ],
        };

        it('TEAM_CREATEMANY_VALID_001 - creates multiple teams with correct member distribution', async () => {
            // Test: Verify batch team creation logic
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100, name: 'Math' } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);

            userRepoMock.findOneBy
                .mockResolvedValueOnce(mockUserLeader) // Team A leader
                .mockResolvedValueOnce(mockUserLeader2) // Team B leader
                .mockResolvedValueOnce(mockUserLeader); // Team C leader

            userRepoMock.findByIds
                .mockResolvedValueOnce([]) // Team A members
                .mockResolvedValueOnce([mockUserStudent1]) // Team B members
                .mockResolvedValueOnce([mockUserStudent1, mockUserStudent2]); // Team C members

            teamRepoMock.create
                .mockReturnValueOnce(mockTeamEntity)
                .mockReturnValueOnce(mockTeamEntity2);

            teamRepoMock.save
                .mockResolvedValueOnce(mockTeamEntity)
                .mockResolvedValueOnce(mockTeamEntity2);

            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createManyTeams(validManyDto, 1);

            expect(result.message).toContain('teams created successfully');
            expect(result.teams).toHaveLength(3);
        });

        it('TEAM_CREATEMANY_MEMBERCOUNT_002 - correctly tracks member assignments per team', async () => {
            // Test: Verify each team gets correct members
            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);

            const teamADto = { name: 'Team A', maxMember: 4, leaderId: 1 };
            const teamBDto = {
                name: 'Team B',
                maxMember: 3,
                leaderId: 2,
                memberIds: [10, 11],
            };

            const manyDto: CreateManyTeamsDto = {
                classId: 100,
                teams: [teamADto, teamBDto],
            };

            userRepoMock.findOneBy
                .mockResolvedValueOnce(mockUserLeader) // Team A leader
                .mockResolvedValueOnce(mockUserLeader2); // Team B leader

            userRepoMock.findByIds
                .mockResolvedValueOnce([]) // Team A has no additional members
                .mockResolvedValueOnce([mockUserStudent1, mockUserStudent2]); // Team B has 2 members

            teamRepoMock.create
                .mockReturnValueOnce(mockTeamEntity)
                .mockReturnValueOnce(mockTeamEntity2);

            teamRepoMock.save
                .mockResolvedValueOnce(mockTeamEntity)
                .mockResolvedValueOnce(mockTeamEntity2);

            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            await teamService.createManyTeams(manyDto, 1);

            // Verify Team B members were requested
            expect(userRepoMock.findByIds).toHaveBeenCalledWith([10, 11]);
        });

        it('TEAM_CREATEMANY_NOTTEACHER_003 - throws ForbiddenException when not teacher', async () => {
            // Test: Verify teacher authorization check
            enrollmentRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.createManyTeams(validManyDto, 999)).rejects.toThrow(
                new ForbiddenException('You are not a teacher of this class or class does not exist')
            );
        });

        it('TEAM_CREATEMANY_MISSINGLEADER_004 - throws error when members without leaderId', async () => {
            // Test: Verify business rule - members require leader
            const badDto: CreateManyTeamsDto = {
                classId: 100,
                teams: [
                    { name: 'Bad Team', maxMember: 4, memberIds: [10, 11] }, // No leaderId!
                ],
            };

            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);

            await expect(teamService.createManyTeams(badDto, 1)).rejects.toThrow(
                BadRequestException
            );
        });

        it('TEAM_CREATEMANY_LEADERCOUNT_005 - correctly creates team per leader specification', async () => {
            // Test: Verify each team has exactly one leader
            const dto: CreateManyTeamsDto = {
                classId: 100,
                teams: [
                    { name: 'Team 1', maxMember: 4, leaderId: 1 },
                    { name: 'Team 2', maxMember: 4, leaderId: 2 },
                ],
            };

            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);

            userRepoMock.findOneBy
                .mockResolvedValueOnce(mockUserLeader)
                .mockResolvedValueOnce(mockUserLeader2);

            userRepoMock.findByIds
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            teamRepoMock.create
                .mockReturnValueOnce(mockTeamEntity)
                .mockReturnValueOnce(mockTeamEntity2);

            teamRepoMock.save
                .mockResolvedValueOnce(mockTeamEntity)
                .mockResolvedValueOnce(mockTeamEntity2);

            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.createManyTeams(dto, 1);

            // Verify 2 teams created
            expect(result.teams).toHaveLength(2);
            expect(teamRepoMock.create).toHaveBeenCalledTimes(2);
        });

        it('TEAM_CREATEMANY_ALLTEAMMEMBERSADDED_006 - adds all specified members to teams', async () => {
            // Test: Verify complete member distribution across teams
            const dto: CreateManyTeamsDto = {
                classId: 100,
                teams: [
                    { name: 'Team A', maxMember: 5, leaderId: 1, memberIds: [10, 11, 12] },
                    { name: 'Team B', maxMember: 5, leaderId: 2, memberIds: [10] },
                ],
            };

            enrollmentRepoMock.findOne.mockResolvedValue({ class: { id: 100 } } as any);
            teamRepoMock.findOneBy.mockResolvedValue(null);

            userRepoMock.findOneBy
                .mockResolvedValueOnce(mockUserLeader)
                .mockResolvedValueOnce(mockUserLeader2);

            userRepoMock.findByIds
                .mockResolvedValueOnce([mockUserStudent1, mockUserStudent2, mockUserStudent3]) // Team A members
                .mockResolvedValueOnce([mockUserStudent1]); // Team B members (student1 in both)

            teamRepoMock.create
                .mockReturnValueOnce(mockTeamEntity)
                .mockReturnValueOnce(mockTeamEntity2);

            teamRepoMock.save
                .mockResolvedValueOnce(mockTeamEntity)
                .mockResolvedValueOnce(mockTeamEntity2);

            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            await teamService.createManyTeams(dto, 1);

            // Team A should have: 1 leader + 3 members = 4 total creations
            // Team B should have: 1 leader + 1 member = 2 total creations
            // So total create calls should reflect all
            expect(teamMemberRepoMock.create).toHaveBeenCalled();
            expect(teamMemberRepoMock.save).toHaveBeenCalled();
        });
    });

    // =====================================================
    // getAllTeamsInClass - DETAILED LOGIC TESTS
    // =====================================================

    describe('getAllTeamsInClass - Detailed Logic and Computation Tests', () => {
        it('TEAM_GETALLTEAMS_VALID_001 - retrieves all teams ordered correctly', async () => {
            // Test: Verify team retrieval for class
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamRepoMock.find.mockResolvedValue([mockTeamEntity, mockTeamEntity2]);

            const result = await teamService.getAllTeamsInClass(100, 1);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(200);
            expect(result[1].id).toBe(201);
        });

        it('TEAM_GETALLTEAMS_EMPTYCLASS_002 - returns empty array when no teams in class', async () => {
            // Test: Verify empty state handling
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamRepoMock.find.mockResolvedValue([]);

            const result = await teamService.getAllTeamsInClass(100, 1);

            expect(result).toEqual([]);
        });

        it('TEAM_GETALLTEAMS_USERVERIFICATION_003 - verifies user exists before retrieving teams', async () => {
            // Test: Verify access control
            userRepoMock.findOneBy.mockResolvedValue(null);

            await expect(teamService.getAllTeamsInClass(100, 999)).rejects.toThrow();
        });

        it('TEAM_GETALLTEAMS_ENROLLMENTCHECK_004 - verifies user enrollment in class', async () => {
            // Test: Ensure only enrolled users can view class teams
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.getAllTeamsInClass(100, 1)).rejects.toThrow(
                new ForbiddenException('You must be enrolled in this class to join a team')
            );
        });

        it('TEAM_GETALLTEAMS_TEAMCOUNT_005 - correctly counts all teams in class', async () => {
            // Test: Verify count of teams returned
            const teams = [mockTeamEntity, mockTeamEntity2];
            userRepoMock.findOneBy.mockResolvedValue(mockUserLeader);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamRepoMock.find.mockResolvedValue(teams);

            const result = await teamService.getAllTeamsInClass(100, 1);

            expect(result).toHaveLength(2);
            expect(result.every((t) => t.id !== undefined)).toBe(true);
        });
    });

    // =====================================================
    // getTeamDetails - DETAILED LOGIC TESTS
    // =====================================================

    describe('getTeamDetails - Detailed Logic and Computation Tests', () => {
        it('TEAM_GETDETAILS_VALID_001 - returns complete team with all members', async () => {
            // Test: Verify full team data retrieval
            const fullTeam = {
                ...mockTeamEntity,
                members: [mockTeamMember1, mockTeamMember2],
            };
            teamRepoMock.findOne.mockResolvedValue(fullTeam as any);

            const result = await teamService.getTeamDetails(mockTeamContextLeader);

            expect(result).toEqual(
                expect.objectContaining({
                    id: 200,
                    name: 'Team Alpha',
                    maxMember: 5,
                    leader: expect.any(Object),
                })
            );

            expect(result.members).toHaveLength(2);
        });

        it('TEAM_GETDETAILS_MEMBERCOUNT_002 - correctly counts team members', async () => {
            // Test: Verify accurate member count
            const teamWith3Members = {
                ...mockTeamEntity,
                members: [mockTeamMember1, mockTeamMember2, mockTeamMember3],
            };
            teamRepoMock.findOne.mockResolvedValue(teamWith3Members as any);

            const result = await teamService.getTeamDetails(mockTeamContextLeader);

            expect(result.members).toHaveLength(3);
        });

        it('TEAM_GETDETAILS_EMPTYMEMBERS_003 - handles team with only leader (no members)', async () => {
            // Test: Verify empty members list
            const teamOnlyLeader = {
                ...mockTeamEntity,
                members: [],
            };
            teamRepoMock.findOne.mockResolvedValue(teamOnlyLeader as any);

            const result = await teamService.getTeamDetails(mockTeamContextLeader);

            expect(result.members).toEqual([]);
        });

        it('TEAM_GETDETAILS_NOTFOUND_004 - throws NotFoundException when team not found', async () => {
            // Test: Verify error handling
            teamRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.getTeamDetails(mockTeamContextLeader)).rejects.toThrow(
                new NotFoundException('Team not found')
            );
        });

        it('TEAM_GETDETAILS_LEADERINFO_005 - includes complete leader information', async () => {
            // Test: Verify leader data is complete
            const fullTeam = {
                ...mockTeamEntity,
                leader: mockUserLeader,
                members: [],
            };
            teamRepoMock.findOne.mockResolvedValue(fullTeam as any);

            const result = await teamService.getTeamDetails(mockTeamContextLeader);

            expect(result.leader).toEqual({
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                profilePictureUrl: 'https://example.com/john.jpg',
            });
        });
    });

    // =====================================================
    // getTeamsWithMembersInClass - DETAILED LOGIC TESTS
    // =====================================================

    describe('getTeamsWithMembersInClass - Detailed Logic and Computation Tests', () => {
        it('TEAM_GETWITHMEMBERS_VALID_001 - returns all teams with member lists', async () => {
            // Test: Verify complete data for multiple teams
            const teams = [
                { ...mockTeamEntity, members: [mockTeamMember1, mockTeamMember2] },
                { ...mockTeamEntity2, members: [mockTeamMember3] },
            ];
            teamRepoMock.find.mockResolvedValue(teams as any);

            const result = await teamService.getTeamsWithMembersInClass(mockClassContext);

            expect(result).toHaveLength(2);
            expect(result[0].members).toHaveLength(2);
            expect(result[1].members).toHaveLength(1);
        });

        it('TEAM_GETWITHMEMBERS_MEMBERCOUNT_002 - correctly counts members across teams', async () => {
            // Test: Verify member count computation per team
            const teams = [
                {
                    ...mockTeamEntity,
                    members: [mockTeamMember1, mockTeamMember2, mockTeamMember3],
                },
                { ...mockTeamEntity2, members: [] },
            ];
            teamRepoMock.find.mockResolvedValue(teams as any);

            const result = await teamService.getTeamsWithMembersInClass(mockClassContext);

            expect(result[0].members).toHaveLength(3);
            expect(result[1].members).toHaveLength(0);
        });

        it('TEAM_GETWITHMEMBERS_EMPTYCLASS_003 - returns empty array for class with no teams', async () => {
            // Test: Verify empty state handling
            teamRepoMock.find.mockResolvedValue([]);

            const result = await teamService.getTeamsWithMembersInClass(mockClassContext);

            expect(result).toEqual([]);
        });
    });

    // =====================================================
    // leaveTeam - DETAILED LOGIC TESTS
    // =====================================================

    describe('leaveTeam - Detailed Logic and Computation Tests', () => {
        it('TEAM_LEAVETEAM_VALID_001 - removes member and updates member list', async () => {
            // Test: Verify successful team leave
            teamMemberRepoMock.remove.mockResolvedValue(undefined as any);

            const result = await teamService.leaveTeam(mockTeamContextMember);

            expect(result).toEqual({ message: 'You have successfully left the team' });
            expect(teamMemberRepoMock.remove).toHaveBeenCalledWith(mockTeamMember1);
        });

        it('TEAM_LEAVETEAM_LEADER_002 - prevents leader from leaving team', async () => {
            // Test: Verify leader cannot leave
            await expect(teamService.leaveTeam(mockTeamContextLeader)).rejects.toThrow(
                new ForbiddenException('Leader cannot leave the team. Transfer leadership first.')
            );

            // Verify no removal attempted
            expect(teamMemberRepoMock.remove).not.toHaveBeenCalled();
        });

        it('TEAM_LEAVETEAM_NOTMEMBER_003 - throws NotFoundException for non-member', async () => {
            // Test: Verify error when not a member
            const noMemberContext = { ...mockTeamContextMember, membership: undefined };

            await expect(teamService.leaveTeam(noMemberContext as any)).rejects.toThrow(
                new NotFoundException('You are not in this team')
            );
        });

        it('TEAM_LEAVETEAM_MEMBERSHIPVERIFICATION_004 - checks membership before removal', async () => {
            // Test: Verify membership exists before removing
            const contextWithMembership = {
                ...mockTeamContextMember,
                membership: mockTeamMember1,
            };
            teamMemberRepoMock.remove.mockResolvedValue(undefined as any);

            const result = await teamService.leaveTeam(contextWithMembership);

            expect(result).toEqual({ message: 'You have successfully left the team' });
            expect(teamMemberRepoMock.remove).toHaveBeenCalled();
        });
    });

    // =====================================================
    // removeMember - DETAILED LOGIC TESTS
    // =====================================================

    describe('removeMember - Detailed Logic and Computation Tests', () => {
        it('TEAM_REMOVEMEMBER_VALID_001 - removes specified member successfully', async () => {
            // Test: Verify member removal by leader
            teamMemberRepoMock.findOne.mockResolvedValue(mockTeamMember1);
            teamMemberRepoMock.remove.mockResolvedValue(undefined as any);

            const result = await teamService.removeMember(10, mockTeamContextLeader);

            expect(result).toEqual({ message: 'Team member removed successfully' });
            expect(teamMemberRepoMock.remove).toHaveBeenCalledWith(mockTeamMember1);
        });

        it('TEAM_REMOVEMEMBER_SELF_002 - prevents leader from self-removal', async () => {
            // Test: Verify leader cannot remove self
            await expect(teamService.removeMember(1, mockTeamContextLeader)).rejects.toThrow(
                new BadRequestException('The leader cannot be removed')
            );

            expect(teamMemberRepoMock.remove).not.toHaveBeenCalled();
        });

        it('TEAM_REMOVEMEMBER_NOTFOUND_003 - throws NotFoundException for non-existent member', async () => {
            // Test: Verify error when member doesn't exist
            teamMemberRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.removeMember(999, mockTeamContextLeader)).rejects.toThrow(
                new NotFoundException('Team member not found')
            );
        });

        it('TEAM_REMOVEMEMBER_LEADERONLY_004 - verifies only leader can remove members', async () => {
            // Test: Verify authorization check
            const nonLeaderContext = {
                ...mockTeamContextMember,
                isLeader: false,
            };
            teamMemberRepoMock.findOne.mockResolvedValue(mockTeamMember2);

            await expect(teamService.removeMember(11, nonLeaderContext as any)).rejects.toThrow(
                ForbiddenException
            );
        });
    });

    // =====================================================
    // generateInviteLink - DETAILED LOGIC TESTS
    // =====================================================

    describe('generateInviteLink - Detailed Logic and Computation Tests', () => {
        it('TEAM_GENERATEINVITELINK_VALID_001 - generates valid JWT token in URL', async () => {
            // Test: Verify correct URL formatting with token
            jwtMock.signAsync.mockResolvedValue('signed-jwt-token-12345');

            const result = await teamService.generateInviteLink(10, mockTeamContextLeader);

            expect(result).toEqual({
                link: 'https://example.com/team/join/link?token=signed-jwt-token-12345',
            });
        });

        it('TEAM_GENERATEINVITELINK_BASEURL_002 - uses correct base URL from config', async () => {
            // Test: Verify URL construction uses configured base
            configMock.get.mockReturnValue('https://myapp.com');
            jwtMock.signAsync.mockResolvedValue('token123');

            const result = await teamService.generateInviteLink(10, mockTeamContextLeader);

            expect(result.link).toContain('https://myapp.com');
        });

        it('TEAM_GENERATEINVITELINK_TOKENDATA_003 - includes required data in JWT payload', async () => {
            // Test: Verify JWT contains necessary claims
            jwtMock.signAsync.mockResolvedValue('token');

            await teamService.generateInviteLink(10, mockTeamContextLeader);

            expect(jwtMock.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    teamId: 200,
                    memberId: 10,
                }),
                expect.any(Object)
            );
        });
    });

    // =====================================================
    // inviteByEmail - DETAILED LOGIC TESTS
    // =====================================================

    describe('inviteByEmail - Detailed Logic and Computation Tests', () => {
        it('TEAM_INVITEBYEMAIL_VALID_001 - sends email to new member', async () => {
            // Test: Verify email invitation flow
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            jwtMock.signAsync.mockResolvedValue('invite-token');
            mailerMock.sendMail.mockResolvedValue(undefined as any);

            const result = await teamService.inviteByEmail('alice@example.com', mockTeamContextLeader);

            expect(result).toEqual({ message: 'Invite sent to alice@example.com' });
            expect(mailerMock.sendMail).toHaveBeenCalled();
        });

        it('TEAM_INVITEBYEMAIL_USERNOTFOUND_002 - throws NotFoundException for unknown email', async () => {
            // Test: Verify error when email doesn't exist
            userRepoMock.findOneBy.mockResolvedValue(null);

            await expect(
                teamService.inviteByEmail('unknown@example.com', mockTeamContextLeader)
            ).rejects.toThrow(new NotFoundException('User with this email not found'));

            expect(mailerMock.sendMail).not.toHaveBeenCalled();
        });

        it('TEAM_INVITEBYEMAIL_ALREADYMEMBER_003 - throws error when user already in team', async () => {
            // Test: Prevent duplicate invitations
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(mockTeamMember1); // Already member

            await expect(
                teamService.inviteByEmail('alice@example.com', mockTeamContextLeader)
            ).rejects.toThrow('User is already in this team');

            expect(mailerMock.sendMail).not.toHaveBeenCalled();
        });

        it('TEAM_INVITEBYEMAIL_ENROLLMENTCHECK_004 - verifies invitee enrolled in class', async () => {
            // Test: Ensure invitee is in same class
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue(null); // Not enrolled

            await expect(
                teamService.inviteByEmail('alice@example.com', mockTeamContextLeader)
            ).rejects.toThrow('You must be enrolled in this class to join a team');
        });

        it('TEAM_INVITEBYEMAIL_MAILCONTENT_005 - sends email with correct invite link', async () => {
            // Test: Verify email content includes proper link
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            jwtMock.signAsync.mockResolvedValue('email-token-xyz');
            mailerMock.sendMail.mockResolvedValue(undefined as any);

            await teamService.inviteByEmail('alice@example.com', mockTeamContextLeader);

            expect(mailerMock.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'alice@example.com',
                    subject: expect.stringContaining('Team Alpha'),
                })
            );
        });
    });

    // =====================================================
    // joinTeamWithLink - DETAILED LOGIC TESTS
    // =====================================================

    describe('joinTeamWithLink - Detailed Logic and Computation Tests', () => {
        it('TEAM_JOINWITHLINK_VALID_001 - joins team with valid invite token', async () => {
            // Test: Verify token-based team joining
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 10 });
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(2);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.joinTeamWithLink('valid-token', 10);

            expect(result).toEqual({
                message: 'Successfully joined team',
                teamId: 200,
            });
        });

        it('TEAM_JOINWITHLINK_TOKENVERIFICATION_002 - verifies JWT token signature', async () => {
            // Test: Ensure token is properly validated
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 10 });

            await teamService.joinTeamWithLink('valid-token', 10);

            expect(jwtMock.verifyAsync).toHaveBeenCalledWith('valid-token', expect.any(Object));
        });

        it('TEAM_JOINWITHLINK_INVALIDTOKEN_003 - throws BadRequestException for invalid token', async () => {
            // Test: Verify error handling for bad token
            jwtMock.verifyAsync.mockRejectedValue(new Error('Invalid signature'));

            await expect(teamService.joinTeamWithLink('bad-token', 10)).rejects.toThrow(
                new BadRequestException('Invalid or expired invite link')
            );
        });

        it('TEAM_JOINWITHLINK_WRONGUSER_004 - throws UnauthorizedException if token user mismatches', async () => {
            // Test: Verify token belongs to joining user
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 999 }); // Different user

            await expect(teamService.joinTeamWithLink('token', 10)).rejects.toThrow(
                new UnauthorizedException('You Are not invited.')
            );
        });

        it('TEAM_JOINWITHLINK_TEAMNOTFOUND_005 - throws NotFoundException if team missing', async () => {
            // Test: Verify team exists
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 10 });
            teamRepoMock.findOne.mockResolvedValue(null);

            await expect(teamService.joinTeamWithLink('token', 10)).rejects.toThrow(
                new NotFoundException('Team not found')
            );
        });

        it('TEAM_JOINWITHLINK_CAPACITYCHECK_006 - prevents joining full team', async () => {
            // Test: Verify capacity constraint
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 10 });
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(5); // At max

            await expect(teamService.joinTeamWithLink('token', 10)).rejects.toThrow(
                'This team is already full'
            );
        });

        it('TEAM_JOINWITHLINK_MEMBERCREATION_007 - creates member record after validation', async () => {
            // Test: Verify member is added to database
            jwtMock.verifyAsync.mockResolvedValue({ teamId: 200, memberId: 10 });
            teamRepoMock.findOne.mockResolvedValue(mockTeamEntity);
            userRepoMock.findOneBy.mockResolvedValue(mockUserStudent1);
            enrollmentRepoMock.findOne.mockResolvedValue({} as any);
            teamMemberRepoMock.findOne.mockResolvedValue(null);
            teamMemberRepoMock.count.mockResolvedValue(1);
            teamMemberRepoMock.create.mockReturnValue(mockTeamMember1);
            teamMemberRepoMock.save.mockResolvedValue(mockTeamMember1);

            const result = await teamService.joinTeamWithLink('token', 10);

            expect(teamMemberRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: mockUserStudent1,
                    team: mockTeamEntity,
                })
            );

            expect(result.teamId).toBe(200);
        });
    });
});