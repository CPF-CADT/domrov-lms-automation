import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { CreateAssignmentDto, CreateClassDto, CreateSubmissionDto, CreateTeamDto, AddTeamMemberDto, EnrollDto } from './dto';
import { AuthenticatedRequest, JwtBoundaryGuard } from './auth';

@UseGuards(JwtBoundaryGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly academic: AcademicService) {}
  @Post() create(@Body() input: CreateClassDto, @Req() req: AuthenticatedRequest) { return this.academic.createClass(input, req.user.sub); }
  @Get() list(@Req() req: AuthenticatedRequest) { return this.academic.listClasses(req.user.sub); }
  @Post(':classId/enrollments') enroll(@Param('classId') classId: string, @Body() input: EnrollDto, @Req() req: AuthenticatedRequest) { return this.academic.enroll(classId, input.userId ?? req.user.sub); }
  @Post(':classId/teams') createTeam(@Param('classId') classId: string, @Body() input: CreateTeamDto, @Req() req: AuthenticatedRequest) { return this.academic.createTeam({ ...input, classId }, req.user.sub); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly academic: AcademicService) {}
  @Post(':teamId/members') addMember(@Param('teamId') teamId: string, @Body() input: AddTeamMemberDto, @Req() req: AuthenticatedRequest) { return this.academic.addTeamMember(teamId, input.userId, req.user.sub); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly academic: AcademicService) {}
  @Post() create(@Body() input: CreateAssignmentDto, @Req() req: AuthenticatedRequest) { return this.academic.createAssignment(input, req.user.sub); }
  @Post(':assignmentId/submissions') submit(@Param('assignmentId') id: string, @Body() input: CreateSubmissionDto, @Req() req: AuthenticatedRequest) { return this.academic.createSubmission(id, input, req.user.sub); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly academic: AcademicService) {}
  @Get(':submissionId') get(@Param('submissionId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getSubmission(id, req.user.sub); }
}
