import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../libs/entities/classroom/team.entity';
import { Enrollment } from '../../libs/entities/classroom/enrollment.entity';
import { User } from '../../libs/entities/user/user.entity';
import { generateJoinCode } from '../../libs/utils/GenerateRandom';
import { CreateTeamDto } from '../../libs/dtos/team/create-team.dto';
import { UserRole } from '../../libs/enums/Role';
import { CreateManyTeamsDto } from '../../libs/dtos/team/create-many-teams.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TeamMember } from '../../libs/entities/classroom/user-team.entity';
import { TeamResponseDto } from '../../libs/dtos/team/team-response.dto';
import { JoinTeamResponseDto } from '../../libs/dtos/team/join-team-response.dto';
import { CreateManyTeamsResponseDto } from '../../libs/dtos/team/create-many-teams-response.dto';
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto';
import { InviteLinkResponseDto } from '../../libs/dtos/team/invite-link-response.dto';
import { ClassContext, TeamContext } from '../../common/security/dtos/guard.dto';

@Injectable()
export class TeamService {

    constructor(
        @InjectRepository(Team)
        private readonly teamRepository: Repository<Team>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Enrollment)
        private readonly enrollmentRepository: Repository<Enrollment>,
        @InjectRepository(TeamMember)
        private readonly teamMemberRepository: Repository<TeamMember>,

        private readonly mailerService: MailerService,
        private config: ConfigService,
        private jwtService: JwtService

    ) {
    }

    async createTeam(createTeamDto: CreateTeamDto, leaderId: number): Promise<TeamResponseDto> {
        const { classId, ...teamData } = createTeamDto;
        const { leader, enrollment } = await this.findUserAndVerifyEnrollment(
            leaderId,
            classId,
        );
        let joinCode: string;
        let codeExists: boolean;
        do {
            joinCode = generateJoinCode();
            codeExists = !!(await this.teamRepository.findOneBy({ joinCode }));
        } while (codeExists);
        const newTeam = this.teamRepository.create({
            ...teamData,
            joinCode,
            leader,
            class: enrollment.class,
        });
        let savedTeam;
        try {
            savedTeam = await this.teamRepository.save(newTeam);
        } catch (err) {
            throw new Error('Failed to create team');
        }
        let teamMember;
        try {
            teamMember = this.teamMemberRepository.create({ user: leader, team: savedTeam });
            await this.teamMemberRepository.save(teamMember);
        } catch (err) {
            throw new Error('Failed to add leader to team');
        }
        return TeamResponseDto.fromEntity(savedTeam);
    }

    async joinTeamWithCode(joinCode: string, studentId: number): Promise<JoinTeamResponseDto> {
        const teamToJoin = await this.teamRepository.findOne({
            where: { joinCode },
            relations: ['class', 'leader'],
        });

        if (!teamToJoin) {
            throw new NotFoundException('Team not found with this code');
        }

        if (!teamToJoin.leader) {
            const student = await this.userRepository.findOneBy({ id: studentId });
            if (!student) throw new NotFoundException('User not found');
            teamToJoin.leader = student;
            await this.teamRepository.save(teamToJoin);
        }

        return this.addMemberToTeam(teamToJoin, studentId);
    }


    async createManyTeams(
        createManyTeamsDto: CreateManyTeamsDto,
        teacherId: number,
    ): Promise<CreateManyTeamsResponseDto> {
        const { classId, teams } = createManyTeamsDto;
        const teacherEnrollment = await this.enrollmentRepository.findOne({
            where: {
                user: { id: teacherId },
                class: { id: classId },
                role: UserRole.Teacher,
            },
            relations: ['class'],
        });
        if (!teacherEnrollment) {
            throw new ForbiddenException(
                'You are not a teacher of this class or class does not exist',
            );
        }
        const classToUpdate = teacherEnrollment.class;
        const createdTeams: Team[] = [];
        for (const teamDto of teams) {
            if (teamDto.memberIds && teamDto.memberIds.length > 0 && !teamDto.leaderId) {
                throw new BadRequestException(
                    `leaderId is required for team "${teamDto.name}" because members are provided.`,
                );
            }
            let joinCode: string;
            let codeExists: boolean;
            do {
                joinCode = generateJoinCode();
                codeExists = !!(await this.teamRepository.findOneBy({ joinCode }));
            } while (codeExists);
            const newTeam = this.teamRepository.create({
                name: teamDto.name,
                maxMember: teamDto.maxMember,
                joinCode,
                class: classToUpdate,
            });
            if (teamDto.leaderId) {
                const leader = await this.userRepository.findOneBy({ id: teamDto.leaderId });
                if (!leader) throw new NotFoundException(`Leader user ${teamDto.leaderId} not found`);
                newTeam.leader = leader;
            }
            let savedTeam;
            try {
                savedTeam = await this.teamRepository.save(newTeam);
            } catch (err) {
                throw new Error('Failed to create team');
            }
            if (teamDto.memberIds && teamDto.memberIds.length > 0) {
                const members = await this.userRepository.findByIds(teamDto.memberIds);
                for (const member of members) {
                    const enrollment = await this.enrollmentRepository.findOne({
                        where: {
                            user: { id: member.id },
                            class: { id: classId },
                            role: UserRole.Student,
                        },
                    });
                    if (!enrollment) continue;
                    const teamMember = this.teamMemberRepository.create({
                        user: member,
                        team: savedTeam,
                    });
                    try {
                        await this.teamMemberRepository.save(teamMember);
                    } catch (err) {
                        throw new Error('Failed to add member to team');
                    }
                }
                if (teamDto.leaderId && !teamDto.memberIds.includes(teamDto.leaderId)) {
                    const leader = await this.userRepository.findOneBy({ id: teamDto.leaderId });
                    const leaderMember = this.teamMemberRepository.create({
                        user: leader ?? undefined,
                        team: savedTeam,
                    });
                    try {
                        await this.teamMemberRepository.save(leaderMember);
                    } catch (err) {
                        throw new Error('Failed to add leader to team');
                    }
                }
            }
            createdTeams.push(savedTeam);
        }
        return {
            message: `${createdTeams.length} teams created successfully.`,
            teams: createdTeams.map(TeamResponseDto.fromEntity),
        };
    }



    async getAllTeamsInClass(classId: number, userId: number): Promise<TeamResponseDto[]> {
        await this.findUserAndVerifyEnrollment(userId, classId);

        const teams = await this.teamRepository.find({
            where: {
                class: { id: classId },
            },
            relations: ['leader'],
            order: {
                name: 'ASC',
            },
        });

        return teams.map(TeamResponseDto.fromEntity);
    }

    async getTeamDetails(context: TeamContext): Promise<TeamResponseDto> {
        // Fetch team with full relations for response (guard only loads leader and class)
        const team = await this.teamRepository.findOne({
            where: { id: context.teamId },
            relations: [
                'leader',
                'members',
                'members.user',
                'class',
            ],
        });

        if (!team) {
            throw new NotFoundException('Team not found');
        }

        return {
            id: team.id,
            name: team.name,
            joinCode: team.joinCode,
            maxMember: team.maxMember,
            leader: team.leader
                ? {
                    id: team.leader.id,
                    firstName: team.leader.firstName,
                    lastName: team.leader.lastName,
                    email: team.leader.email,
                    profilePictureUrl: team.leader.profilePictureUrl || null,
                }
                : null,
            members: team.members.map((member) => ({
                id: member.user.id,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                profilePictureUrl: member.user.profilePictureUrl || null,
            })),
        };
    }

    async getTeamsWithMembersInClass(context: ClassContext): Promise<TeamResponseDto[]> {
        const teams = await this.teamRepository.find({
            where: { class: { id: context.classId } },
            relations: ['leader', 'members', 'members.user'],
            order: { name: 'ASC' },
        });

        return teams.map((team) => ({
            id: team.id,
            name: team.name,
            joinCode: team.joinCode,
            maxMember: team.maxMember,
            leader: team.leader
                ? {
                    id: team.leader.id,
                    firstName: team.leader.firstName,
                    lastName: team.leader.lastName,
                    email: team.leader.email,
                    profilePictureUrl: team.leader.profilePictureUrl || null,
                }
                : null,
            members: team.members.map((m) => ({
                id: m.user.id,
                firstName: m.user.firstName,
                lastName: m.user.lastName,
                email: m.user.email,
                profilePictureUrl: m.user.profilePictureUrl || null,
            })),
        }));
    }

    async leaveTeam(context: TeamContext): Promise<MessageResponseDto> {
        if (!context?.teamEntity) {
            throw new NotFoundException('Team context not available');
        }
        if (context.isLeader) {
            throw new ForbiddenException('Leader cannot leave the team. Transfer leadership first.');
        }
        if (!context.membership) {
            throw new NotFoundException('You are not in this team');
        }
        await this.teamMemberRepository.remove(context.membership);
        return { message: 'You have successfully left the team' };
    }

    async removeMember(
        memberId: number,
        context: TeamContext,
    ): Promise<MessageResponseDto> {
        if (!context?.teamEntity) {
            throw new NotFoundException('Team context not available');
        }
        if (!context.isLeader) {
            throw new ForbiddenException('Only the team leader can remove members');
        }
        if (memberId === context.userId) {
            throw new BadRequestException('The leader cannot be removed');
        }
        const member = await this.teamMemberRepository.findOne({
            where: {
                team: { id: context.teamId },
                user: { id: memberId },
            },
        });
        if (!member) {
            throw new NotFoundException('Team member not found');
        }
        await this.teamMemberRepository.remove(member);
        return { message: 'Team member removed successfully' };
    }


    private async addMemberToTeam(team: Team, studentId: number): Promise<JoinTeamResponseDto> {
        const { leader: student } = await this.findUserAndVerifyEnrollment(
            studentId,
            team.class.id,
        );
        if (await this.isUserInTeam(team.id, studentId)) {
            throw new ConflictException('You are already in this team');
        }
        const memberCount = await this.teamMemberRepository.count({
            where: { team: { id: team.id } },
        });
        if (memberCount >= team.maxMember) {
            throw new ConflictException('This team is already full');
        }
        const newMember = this.teamMemberRepository.create({
            user: student,
            team: team,
        });
        try {
            await this.teamMemberRepository.save(newMember);
        } catch (err) {
            throw new Error('Failed to add member to team');
        }
        return { message: 'Successfully joined team', teamId: team.id };
    }

    private async findUserAndVerifyEnrollment(userId: number, classId: number) {
        const leader = await this.userRepository.findOneBy({ id: userId });
        if (!leader) throw new NotFoundException('User not found');

        const enrollment = await this.enrollmentRepository.findOne({
            where: { user: { id: userId }, class: { id: classId } },
            relations: ['class'],
        });
        if (!enrollment) {
            throw new ForbiddenException('You must be enrolled in this class to join a team');
        }

        return { leader, enrollment };
    }

    private async isUserInTeam(
        teamId: number,
        userId: number,
    ): Promise<TeamMember | null> {
        return this.teamMemberRepository.findOne({
            where: {
                team: { id: teamId },
                user: { id: userId },
            },
        });
    }

    async generateInviteLink(
        memberId: number,
        context: TeamContext,
    ): Promise<InviteLinkResponseDto> {
        const token = await this.jwtService.signAsync(
            { teamId: context.teamId, memberId },
            {
                secret: this.config.get<string>('TEAM_INVITE_SECRET'),
                expiresIn: '7d',
            },
        );

        const baseUrl = this.config.get<string>('BASE_URL');

        return {
            link: `${baseUrl}/team/join/link?token=${token}`,
        };
    }

    async inviteByEmail(email: string, context: TeamContext): Promise<MessageResponseDto> {
        if (!context?.teamEntity) {
            throw new NotFoundException('Team context not available');
        }
        const team = context.teamEntity;
        const userToInvite = await this.userRepository.findOneBy({ email });
        if (!userToInvite) {
            throw new NotFoundException('User with this email not found');
        }
        await this.findUserAndVerifyEnrollment(userToInvite.id, team.class.id);
        if (await this.isUserInTeam(team.id, userToInvite.id)) {
            throw new ConflictException('User is already in this team');
        }
        const { link } = await this.generateInviteLink(userToInvite.id, context);
        try {
            await this.mailerService.sendMail({
                to: userToInvite.email,
                subject: `You're invited to join ${team.name}!`,
                text: `Hello ${userToInvite.firstName},\n\nYou are invited to join the team "${team.name}".\nClick this link: ${link}`,
                html: `
                <p>Hello ${userToInvite.firstName},</p>
                <p>You have been invited to join the team <b>${team.name}</b> in class <b>${team.class.name}</b>.</p>
                <a href=\"${link}\">Join Team</a>
            `,
            });
        } catch (emailErr) {
            throw new BadRequestException('Failed to send invitation email');
        }
        return { message: `Invite sent to ${email}` };
    }

    async joinTeamWithLink(token: string, studentId: number): Promise<JoinTeamResponseDto> {
        let payload: any;

        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: this.config.get<string>('TEAM_INVITE_SECRET'),
            });
        } catch {
            throw new BadRequestException('Invalid or expired invite link');
        }

        const { teamId, memberId } = payload;
        if (memberId != studentId) {
            throw new UnauthorizedException('You Are not invited.')
        }
        const team = await this.teamRepository.findOne({
            where: { id: teamId },
            relations: ['class'],
        });

        if (!team) {
            throw new NotFoundException('Team not found');
        }


        await this.findUserAndVerifyEnrollment(studentId, team.class.id);

        if (await this.isUserInTeam(team.id, studentId)) {
            throw new ConflictException('You are already in this team');
        }

        if (team.leader.id === studentId) {
            throw new ConflictException('Leader is already part of the team');
        }

        return this.addMemberToTeam(team, studentId);
    }


}