import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../../libs/entities/classroom/team.entity';
import { TeamMember } from '../../../libs/entities/classroom/user-team.entity';
import { TeamContext } from '../dtos/guard.dto';
import { ClassPermissionService } from './class-permission.service';

@Injectable()
export class TeamPermissionService {
    constructor(
        @InjectRepository(Team)
        private readonly teamRepo: Repository<Team>,
        @InjectRepository(TeamMember)
        private readonly teamMemberRepo: Repository<TeamMember>,
        private readonly classPermissionService: ClassPermissionService,
    ) { }

    async getTeamContext(
        userId: number,
        teamId: number,
    ): Promise<TeamContext | null> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['leader', 'class'],
        });

        if (!team) {
            return null;
        }

        const isLeader = team.leader?.id === userId;

        const membership = await this.teamMemberRepo.findOne({
            where: {
                team: { id: teamId },
                user: { id: userId },
            },
        });

        // User must be leader or have membership
        if (!isLeader && !membership) {
            return null;
        }

        return {
            teamId,
            userId,
            isLeader,
            isMember: !!membership || isLeader,
            isApproved: membership?.isApproved ?? isLeader, // Leaders are always approved
            teamEntity: team,
            membership: membership || undefined,
        };
    }

    async isMemberOfTeam(userId: number, teamId: number): Promise<boolean> {
        const context = await this.getTeamContext(userId, teamId);
        return context?.isMember === true;
    }

    async isApprovedMemberOfTeam(
        userId: number,
        teamId: number,
    ): Promise<boolean> {
        const context = await this.getTeamContext(userId, teamId);
        return context?.isApproved === true;
    }

    async isLeaderOfTeam(userId: number, teamId: number): Promise<boolean> {
        const context = await this.getTeamContext(userId, teamId);
        return context?.isLeader === true;
    }

    async canManageTeam(userId: number, teamId: number): Promise<boolean> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['leader', 'class'],
        });

        if (!team) return false;

        // Team leader can manage
        if (team.leader?.id === userId) return true;

        // Class instructors can manage
        if (team.class) {
            return this.classPermissionService.isInstructorOfClass(userId, team.class.id);
        }

        return false;
    }

    // TEAM VERIFICATION (throws exception)

    async verifyIsTeamMember(
        userId: number,
        teamId: number,
    ): Promise<TeamContext> {
        const team = await this.teamRepo.findOne({ where: { id: teamId } });
        if (!team) {
            throw new NotFoundException(`Team with ID ${teamId} not found`);
        }

        const context = await this.getTeamContext(userId, teamId);
        if (!context || !context.isMember) {
            throw new ForbiddenException('You are not a member of this team');
        }

        return context;
    }

    async verifyIsApprovedTeamMember(
        userId: number,
        teamId: number,
    ): Promise<TeamContext> {
        const context = await this.verifyIsTeamMember(userId, teamId);

        if (!context.isApproved) {
            throw new ForbiddenException('Your team membership is pending approval');
        }

        return context;
    }

    async verifyIsTeamLeader(
        userId: number,
        teamId: number,
    ): Promise<TeamContext> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['leader'],
        });

        if (!team) {
            throw new NotFoundException(`Team with ID ${teamId} not found`);
        }

        if (team.leader?.id !== userId) {
            throw new ForbiddenException(
                'Only the team leader can perform this action',
            );
        }

        const context = await this.getTeamContext(userId, teamId);
        return context!;
    }

    async verifyCanManageTeam(
        userId: number,
        teamId: number,
    ): Promise<TeamContext> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['leader', 'class'],
        });

        if (!team) {
            throw new NotFoundException(`Team with ID ${teamId} not found`);
        }

        const canManage = await this.canManageTeam(userId, teamId);
        if (!canManage) {
            throw new ForbiddenException(
                'You do not have permission to manage this team',
            );
        }

        const context = await this.getTeamContext(userId, teamId);
        return (
            context || {
                teamId,
                userId,
                isLeader: false,
                isMember: false,
                isApproved: false,
                teamEntity: team,
            }
        );
    }
}
