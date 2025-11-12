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
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamService } from './team.service';
import { CreateTeamDto } from '../../../libs/dtos/team/create-team.dto';
import { UserId } from '../../common/decorators/user.decorator';
import { JoinTeamDto } from '../../../libs/dtos/team/join-team.dto';
import { CreateManyTeamsDto } from '../../../libs/dtos/team/create-many-teams.dto';

@ApiTags('Team')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new team within a class' })
  @ApiResponse({
    status: 201,
    description: 'The team has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Not enrolled in this class' })
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @UserId() userId: number,
  ) {
    return this.teamService.createTeam(createTeamDto, userId);
  }

  @Post('join/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a team using a join code' })
  @ApiResponse({ status: 200, description: 'Successfully joined team' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 409, description: 'User already in team or team full' })
  async joinTeamWithCode(
    @Body() joinTeamDto: JoinTeamDto,
    @UserId() userId: number,
  ) {
    return this.teamService.joinTeamWithCode(joinTeamDto.joinCode, userId);
  }


  @Delete(':teamId/member/:memberId')
  @ApiOperation({ summary: 'Remove a member from a team (Leader only)' })
  @ApiParam({ name: 'teamId', description: 'The team ID' })
  @ApiParam({ name: 'memberId', description: 'The member ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Not the team leader' })
  @ApiResponse({ status: 404, description: 'Member not found in team' })
  async removeMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @UserId() leaderId: number,
  ) {
    return this.teamService.removeMember(teamId, memberId, leaderId);
  }

  @Post('team/many')
  @ApiOperation({ summary: 'Create multiple teams in a class (Teacher only)' })
  @ApiResponse({
    status: 201,
    description: 'The teams have been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Not a teacher of this class' })
  async createManyTeams(
    @Body() createManyTeamsDto: CreateManyTeamsDto,
    @UserId() teacherId: number,
  ) {
    return this.teamService.createManyTeams(createManyTeamsDto, teacherId);
  }

  @Get('team/:teamId/details')
  @ApiOperation({ summary: 'Get team details (leader and members)' })
  @ApiParam({ name: 'teamId', description: 'The team ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 403, description: 'Not enrolled in the class' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeamDetails(
    @Param('teamId', ParseIntPipe) teamId: number,
    @UserId() userId: number,
  ) {
    return this.teamService.getTeamDetails(teamId, userId);
  }

  @Get('class/:classId/with-members')
  @ApiOperation({ summary: 'Get all teams in a class with their members' })
  @ApiResponse({ status: 200, description: 'Teams fetched successfully' })
  async getTeamsWithMembers(@Param('classId') classId: number, @UserId() userId: number) {
    return this.teamService.getTeamsWithMembersInClass(classId, userId);
  }

  @Delete(':teamId/leave')
  @ApiOperation({ summary: 'Leave a team (non-leader only)' })
  @ApiResponse({ status: 200, description: 'Left the team successfully' })
  async leaveTeam(@Param('teamId') teamId: number, @UserId() userId: number) {
    return this.teamService.leaveTeam(teamId, userId);
  }
}



// @Get('join/link')
// @ApiOperation({ summary: 'Join a team using an invite link token' })
// @ApiQuery({ name: 'token', description: 'The JWT invite token from the link' })
// @ApiResponse({ status: 200, description: 'Successfully joined team' })
// @ApiResponse({ status: 400, description: 'Invalid or expired invite link' })
// async joinTeamWithLink(
//   @Query('token') token: string,
//   @UserId() userId: number,
// ) {
//   return this.teamService.joinTeamWithLink(token, userId);
// }

// @Post(':id/invite/link')
// @ApiOperation({ summary: 'Generate a new team invite link (Leader only)' })
// @ApiParam({ name: 'id', description: 'The team ID' })
// @ApiResponse({ status: 201, description: 'Returns the generated invite link' })
// @ApiResponse({ status: 403, description: 'Not the team leader' })
// async generateInviteLink(
//   @Param('id', ParseIntPipe) teamId: number,
//   @UserId() leaderId: number,
// ) {
//   return this.teamService.generateInviteLink(teamId, leaderId);
// }

// @Post(':id/invite/email')
// @HttpCode(HttpStatus.OK)
// @ApiOperation({ summary: 'Invite a user to the team by email (Leader only)' })
// @ApiParam({ name: 'id', description: 'The team ID' })
// @ApiResponse({ status: 200, description: 'Invite sent successfully' })
// @ApiResponse({ status: 404, description: 'User to invite not found' })
// async inviteUserByEmail(
//   @Param('id', ParseIntPipe) teamId: number,
//   @Body() inviteTeamDto: InviteTeamDto,
//   @UserId() leaderId: number,
// ) {
//   return this.teamService.inviteByEmail(
//     teamId,
//     inviteTeamDto.email,
//     leaderId,
//   );
// }