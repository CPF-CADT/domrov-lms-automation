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
import { Team } from '../../../libs/entities/team.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';
import { User } from '../../../libs/entities/user.entity';
import { TeamMember } from '../../../libs/entities/user-team.entity';
import { generateJoinCode } from '../../../libs/utils/GenerateRandom';
import { CreateTeamDto } from '../../../libs/dtos/team/create-team.dto';
import { UserRole } from '../../../libs/enums/Role';
import { CreateManyTeamsDto } from '../../../libs/dtos/team/create-many-teams.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

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

    async createTeam(createTeamDto: CreateTeamDto, leaderId: number) {
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
        const savedTeam = await this.teamRepository.save(newTeam);

        const teamMember = this.teamMemberRepository.create({
            user: leader,
            team: savedTeam,
        });
        await this.teamMemberRepository.save(teamMember);

        return savedTeam;
    }

    async joinTeamWithCode(joinCode: string, studentId: number) {
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
    ) {
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

            const savedTeam = await this.teamRepository.save(newTeam);

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
                    await this.teamMemberRepository.save(teamMember);
                }

                if (teamDto.leaderId && !teamDto.memberIds.includes(teamDto.leaderId)) {
                    const leader = await this.userRepository.findOneBy({ id: teamDto.leaderId });
                    const leaderMember = this.teamMemberRepository.create({
                        user: leader ?? undefined,
                        team: savedTeam,
                    });
                    await this.teamMemberRepository.save(leaderMember);
                }
            }

            createdTeams.push(savedTeam);
        }

        const teamsWithoutClass = createdTeams.map(({ class: _, ...team }) => team);

        return {
            message: `${createdTeams.length} teams created successfully.`,
            teams: teamsWithoutClass,
        };
    }



    async getAllTeamsInClass(classId: number, userId: number) {
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
                }
                : null,
        }));
    }

    async getTeamDetails(teamId: number, userId: number) {
        const team = await this.teamRepository.findOne({
            where: { id: teamId },
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

        await this.findUserAndVerifyEnrollment(userId, team.class.id);

        const leader = team.leader
            ? {
                id: team.leader.id,
                firstName: team.leader.firstName,
                lastName: team.leader.lastName,
                email: team.leader.email,
            }
            : null;

        const members = team.members.map((member) => {
            const { password, ...memberDetails } = member.user;
            return memberDetails;
        });

        return {
            id: team.id,
            name: team.name,
            joinCode: team.joinCode,
            maxMember: team.maxMember,
            leader,
            members,
        };
    }

    async getTeamsWithMembersInClass(classId: number, userId: number) {
        await this.findUserAndVerifyEnrollment(userId, classId);

        const teams = await this.teamRepository.find({
            where: { class: { id: classId } },
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
                }
                : null,
            members: team.members.map((m) => ({
                id: m.user.id,
                firstName: m.user.firstName,
                lastName: m.user.lastName,
                email: m.user.email,
            })),
        }));
    }

    async leaveTeam(teamId: number, userId: number) {
        const teamMember = await this.teamMemberRepository.findOne({
            where: { team: { id: teamId }, user: { id: userId } },
            relations: ['team', 'team.leader'],
        });

        if (!teamMember) throw new NotFoundException('You are not in this team');

        const team = teamMember.team;

        if (team.leader && team.leader.id === userId) {
            throw new ForbiddenException('Leader cannot leave the team. Transfer leadership first.');
        }

        await this.teamMemberRepository.remove(teamMember);
        return { message: 'You have successfully left the team' };
    }

    async removeMember(
        teamId: number,
        memberId: number,
        leaderId: number,
    ) {
        const { team } = await this.findTeamAndVerifyLeader(teamId, leaderId);

        if (memberId === leaderId) {
            throw new BadRequestException('The leader cannot be removed');
        }

        const member = await this.teamMemberRepository.findOne({
            where: {
                team: { id: teamId },
                user: { id: memberId },
            },
        });

        if (!member) {
            throw new NotFoundException('Team member not found');
        }

        await this.teamMemberRepository.remove(member);
        return { message: 'Team member removed successfully' };
    }


    private async addMemberToTeam(team: Team, studentId: number) {
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

        await this.teamMemberRepository.save(newMember);
        return { message: 'Successfully joined team', teamId: team.id };
    }

    private async findTeamAndVerifyLeader(teamId: number, leaderId: number) {
        const team = await this.teamRepository.findOne({
            where: { id: teamId },
            relations: ['leader', 'class'],
        });

        if (!team) {
            throw new NotFoundException('Team not found');
        }

        if (team.leader.id !== leaderId) {
            throw new ForbiddenException('Only the team leader can perform this action');
        }

        return { team };
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
        teamId: number,
        leaderId: number,
        memberId:number,
        internalCall: boolean = false,
    ) {
        if (!internalCall) {
            await this.findTeamAndVerifyLeader(teamId, leaderId);
        }

        const token = await this.jwtService.signAsync(
            { teamId ,memberId},
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

    async inviteByEmail(teamId: number, email: string, leaderId: number) {
        const { team } = await this.findTeamAndVerifyLeader(teamId, leaderId);

        const userToInvite = await this.userRepository.findOneBy({ email });
        if (!userToInvite) {
            throw new NotFoundException('User with this email not found');
        }

        await this.findUserAndVerifyEnrollment(userToInvite.id, team.class.id);

        if (await this.isUserInTeam(team.id, userToInvite.id)) {
            throw new ConflictException('User is already in this team');
        }

        const { link } = await this.generateInviteLink(teamId, leaderId, userToInvite.id,true);

        await this.mailerService.sendMail({
            to: userToInvite.email,
            subject: `You're invited to join ${team.name}!`,
            text: `Hello ${userToInvite.firstName},\n\nYou are invited to join the team "${team.name}".\nClick this link: ${link}`,
            html: `
            <p>Hello ${userToInvite.firstName},</p>
            <p>You have been invited to join the team <b>${team.name}</b> in class <b>${team.class.name}</b>.</p>
            <a href="${link}">Join Team</a>
        `,
        });

        return { message: `Invite sent to ${email}` };
    }

    async joinTeamWithLink(token: string, studentId: number) {
        let payload: any;

        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: this.config.get<string>('TEAM_INVITE_SECRET'),
            });
        } catch {
            throw new BadRequestException('Invalid or expired invite link');
        }

        const { teamId,memberId } = payload;
        if(memberId!=studentId){
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