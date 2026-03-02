// src/team/team.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  ParseIntPipe,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamService } from './team.service';
import { CreateTeamDto } from '../../libs/dtos/team/create-team.dto';
import { UserId } from '../../common/decorators/user.decorator';
import { InviteTeamByEmailDto, JoinTeamByTokenDto, JoinTeamDto } from '../../libs/dtos/team/join-team.dto';
import { CreateManyTeamsDto } from '../../libs/dtos/team/create-many-teams.dto';
import { TeamResponseDto } from '../../libs/dtos/team/team-response.dto';
import { JoinTeamResponseDto } from '../../libs/dtos/team/join-team-response.dto';
import { CreateManyTeamsResponseDto } from '../../libs/dtos/team/create-many-teams-response.dto';
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto';
import { ClassOwnerGuard, ClassMemberGuard, TeamMemberGuard, TeamLeaderGuard, GetClassContext, GetTeamContext } from '../../common/security';
import type { ClassContext, TeamContext } from '../../common/security/dtos/guard.dto';

@ApiTags('Team')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) { }

  // ==================== TEAM CREATION ====================

  @UseGuards(ClassMemberGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a new team',
    description: 'Creates a new team within a class. The creator becomes the team leader.',
  })
  @ApiBody({ type: CreateTeamDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Team A',
          classId: 1,
          leaderId: 5,
          leaderName: 'John Doe',
          joinCode: 'ABC123',
          members: [],
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'User is not enrolled in this class' })
  @ApiNotFoundResponse({ description: 'User or class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: TeamResponseDto }> {
    const data = await this.teamService.createTeam(createTeamDto, userId);
    return { success: true, data };
  }

  @UseGuards(ClassOwnerGuard)
  @Post('many')
  @ApiOperation({
    summary: 'Create multiple teams',
    description: 'Creates multiple teams in a class at once. Only teachers can use this endpoint.',
  })
  @ApiBody({ type: CreateManyTeamsDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: {
          teams: [
            {
              id: 1,
              name: 'Team A',
              classId: 1,
              leaderId: 5,
              leaderName: 'John Doe',
              joinCode: 'ABC123',
              members: [],
              createdAt: '2026-03-01T10:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'User is not a teacher of this class' })
  @ApiBadRequestResponse({ description: 'leaderId is required when memberIds are provided' })
  @ApiNotFoundResponse({ description: 'Class or user not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async createManyTeams(
    @Body() createManyTeamsDto: CreateManyTeamsDto,
    @UserId() teacherId: number,
  ): Promise<{ success: true; data: CreateManyTeamsResponseDto }> {
    const data = await this.teamService.createManyTeams(createManyTeamsDto, teacherId);
    return { success: true, data };
  }

  // ==================== JOIN TEAM ====================

  @Post('join/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a team using a join code',
    description: 'Students can join a team by entering the 6-character join code. User must be enrolled in the class.',
  })
  @ApiBody({ type: JoinTeamDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          teamId: 1,
          teamName: 'Team A',
          classId: 1,
          joinedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Team not found with this code' })
  @ApiConflictResponse({ description: 'User is already in this team or team is full' })
  @ApiForbiddenResponse({ description: 'User is not enrolled in the class' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async joinTeamWithCode(
    @Body() joinTeamDto: JoinTeamDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: JoinTeamResponseDto }> {
    const data = await this.teamService.joinTeamWithCode(joinTeamDto.joinCode, userId);
    return { success: true, data };
  }

  @Post('join/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a team using an invite token',
    description: 'Students can join a team by clicking an invite link with a JWT token.',
  })
  @ApiBody({ type: JoinTeamByTokenDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          teamId: 1,
          teamName: 'Team A',
          classId: 1,
          joinedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired invite link' })
  @ApiConflictResponse({ description: 'User is already in this team' })
  @ApiUnauthorizedResponse({ description: 'You are not invited to this team' })
  @ApiNotFoundResponse({ description: 'Team not found' })
  async joinTeamByToken(
    @Body() dto: JoinTeamByTokenDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: JoinTeamResponseDto }> {
    const data = await this.teamService.joinTeamWithLink(dto.token, userId);
    return { success: true, data };
  }

  // ==================== GET TEAMS ====================

  @UseGuards(ClassMemberGuard)
  @Get('class/:classId')
  @ApiOperation({
    summary: 'Get all teams in a class with members',
    description: 'Returns all teams in a class including their leaders and members. User must be a class member.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: 'Team A',
            classId: 1,
            leaderId: 5,
            leaderName: 'John Doe',
            joinCode: 'ABC123',
            members: [],
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  @ApiForbiddenResponse({ description: 'User is not a member of this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getTeamsWithMembers(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: TeamResponseDto[] }> {
    const data = await this.teamService.getTeamsWithMembersInClass(context);
    return { success: true, data };
  }

  @UseGuards(TeamMemberGuard)
  @Get(':teamId')
  @ApiOperation({
    summary: 'Get team details',
    description: 'Returns detailed information about a team including leader and all members.',
  })
  @ApiParam({ name: 'teamId', type: Number, example: 1, description: 'The ID of the team' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Team A',
          classId: 1,
          leaderId: 5,
          leaderName: 'John Doe',
          joinCode: 'ABC123',
          members: [],
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'User is not enrolled in the class' })
  @ApiNotFoundResponse({ description: 'Team not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getTeamDetails(
    @Param('teamId', ParseIntPipe) teamId: number,
    @GetTeamContext() context: TeamContext,
  ): Promise<{ success: true; data: TeamResponseDto }> {
    const data = await this.teamService.getTeamDetails(context);
    return { success: true, data };
  }

  // ==================== INVITE ====================

  @UseGuards(TeamLeaderGuard)
  @Post(':teamId/invite')
  @ApiOperation({
    summary: 'Invite a user to a team by email',
    description: 'Sends an email invitation to join the team. Only the team leader can invite. User must be enrolled in the class.',
  })
  @ApiParam({ name: 'teamId', type: Number, example: 1, description: 'The ID of the team' })
  @ApiBody({ type: InviteTeamByEmailDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Invitation email sent successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Only the team leader can invite members' })
  @ApiNotFoundResponse({ description: 'Team or user not found' })
  @ApiConflictResponse({ description: 'User is already in this team' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async inviteTeamByEmail(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body() dto: InviteTeamByEmailDto,
    @GetTeamContext() context: TeamContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.teamService.inviteByEmail(dto.email, context);
    return { success: true, data };
  }

  // ==================== LEAVE / REMOVE ====================

  @UseGuards(TeamMemberGuard)
  @Delete(':teamId/leave')
  @ApiOperation({
    summary: 'Leave a team',
    description: 'Allows a team member to leave the team. Leaders cannot leave - they must transfer leadership first.',
  })
  @ApiParam({ name: 'teamId', type: Number, example: 1, description: 'The ID of the team to leave' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Successfully left the team',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Leader cannot leave the team. Transfer leadership first.' })
  @ApiNotFoundResponse({ description: 'You are not in this team' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async leaveTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
    @GetTeamContext() context: TeamContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.teamService.leaveTeam(context);
    return { success: true, data };
  }

  @UseGuards(TeamLeaderGuard)
  @Delete(':teamId/members/:memberId')
  @ApiOperation({
    summary: 'Remove a member from a team',
    description: 'Removes a member from the team. Only the team leader can remove members.',
  })
  @ApiParam({ name: 'teamId', type: Number, example: 1, description: 'The ID of the team' })
  @ApiParam({ name: 'memberId', type: Number, example: 5, description: 'The ID of the member to remove' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Member removed successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Only the team leader can remove members' })
  @ApiBadRequestResponse({ description: 'The leader cannot be removed' })
  @ApiNotFoundResponse({ description: 'Team or member not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async removeMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @GetTeamContext() context: TeamContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.teamService.removeMember(memberId, context);
    return { success: true, data };
  }
}