import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { CreateAssignmentDto, CreateClassDto, CreateSubmissionDto, CreateTeamDto, AddTeamMemberDto, FeedbackDto, GradeSubmissionDto, JoinClassDto, JoinTeamDto, NotifyUploadDto, UpdateAssignmentDto, UpdateClassDto } from './dto';
import { AuthenticatedRequest, JwtBoundaryGuard } from './auth';

@UseGuards(JwtBoundaryGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly academic: AcademicService) {}
  @Post() create(@Body() input: CreateClassDto, @Req() req: AuthenticatedRequest) { return this.academic.createClass(input, req.user.sub); }
  @Get() list(@Req() req: AuthenticatedRequest) { return this.academic.listClasses(req.user.sub); }
  @Post(':classId/enrollments') enroll(@Param('classId') classId: string, @Req() req: AuthenticatedRequest) { return this.academic.enroll(classId, req.user.sub); }
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

/** Legacy route aliases keep the existing frontend contract while ownership moves to academic_db. */
@UseGuards(JwtBoundaryGuard)
@Controller('class')
export class LegacyClassController {
  constructor(private readonly academic: AcademicService) {}
  @Post() create(@Body() input: CreateClassDto, @Req() req: AuthenticatedRequest) { return { success: true, data: this.academic.createClass(input, req.user.sub) }; }
  @Get('my-classes') list(@Req() req: AuthenticatedRequest) { return this.academic.listClasses(req.user.sub).then(data => ({ success: true, data })); }
  @Patch(':classId') update(@Param('classId') id: string, @Body() input: UpdateClassDto, @Req() req: AuthenticatedRequest) { return this.academic.updateClass(id, input, req.user.sub).then(data => ({ success: true, data })); }
  @Delete(':classId') remove(@Param('classId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.deleteClass(id, req.user.sub).then(data => ({ success: true, data })); }
  @Post('join/code') join(@Body() input: JoinClassDto, @Req() req: AuthenticatedRequest) { return this.academic.joinClass(input, req.user.sub).then(data => ({ success: true, data })); }
  @Get(':classId/students') students(@Param('classId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.listStudents(id, req.user.sub).then(data => ({ success: true, data })); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('team')
export class LegacyTeamController {
  constructor(private readonly academic: AcademicService) {}
  @Post() create(@Body() input: CreateTeamDto, @Req() req: AuthenticatedRequest) { return this.academic.createTeam(input, req.user.sub).then(data => ({ success: true, data })); }
  @Post('join/code') join(@Body() input: JoinTeamDto, @Req() req: AuthenticatedRequest) { return this.academic.joinTeam(input, req.user.sub).then(data => ({ success: true, data })); }
  @Get('class/:classId') list(@Param('classId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.listTeams(id, req.user.sub).then(data => ({ success: true, data })); }
  @Get(':teamId') get(@Param('teamId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getTeam(id, req.user.sub).then(data => ({ success: true, data })); }
  @Delete(':teamId') remove(@Param('teamId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.deleteTeam(id, req.user.sub).then(data => ({ success: true, data })); }
  @Delete(':teamId/leave') leave(@Param('teamId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.removeTeamMember(id, req.user.sub, req.user.sub).then(data => ({ success: true, data })); }
  @Delete(':teamId/members/:memberId') removeMember(@Param('teamId') id: string, @Param('memberId') memberId: string, @Req() req: AuthenticatedRequest) { return this.academic.removeTeamMember(id, memberId, req.user.sub).then(data => ({ success: true, data })); }
  @Post(':teamId/members/:memberId') addMember(@Param('teamId') id: string, @Param('memberId') memberId: string, @Req() req: AuthenticatedRequest) { return this.academic.addTeamMember(id, memberId, req.user.sub).then(data => ({ success: true, data })); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('assessments')
export class LegacyAssessmentController {
  constructor(private readonly academic: AcademicService) {}
  @Get('class/:classId') list(@Param('classId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.listAssignments(id, req.user.sub).then(data => ({ success: true, data })); }
  @Get('class/:classId/:sessionId') listSession(@Param('classId') id: string, @Param('sessionId') session: string, @Req() req: AuthenticatedRequest) { return this.academic.listAssignments(id, req.user.sub, Number(session)).then(data => ({ success: true, data })); }
  @Get(':id') get(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getAssignment(id, req.user.sub).then(data => ({ success: true, data })); }
  @Post('class/:classId/draft') draft(@Param('classId') classId: string, @Body() input: CreateAssignmentDto, @Req() req: AuthenticatedRequest) { return this.academic.createAssignment({ ...input, classId }, req.user.sub).then(data => ({ success: true, data })); }
  @Patch(':id') update(@Param('id') id: string, @Body() input: UpdateAssignmentDto, @Req() req: AuthenticatedRequest) { return this.academic.updateAssignment(id, input, req.user.sub).then(data => ({ success: true, data })); }
  @Patch(':id/publish') publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.academic.publishAssignment(id, req.user.sub).then(data => ({ success: true, data })); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.academic.deleteAssignment(id, req.user.sub).then(data => ({ success: true, data })); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('submissions')
export class LegacySubmissionController {
  constructor(private readonly academic: AcademicService) {}
  @Patch(':assessmentId/submit') draft(@Param('assessmentId') id: string, @Body() input: CreateSubmissionDto, @Req() req: AuthenticatedRequest) { return this.academic.saveDraft(id, input, req.user.sub).then(data => ({ success: true, data })); }
  @Post(':assessmentId/submit') submit(@Param('assessmentId') id: string, @Body() input: CreateSubmissionDto, @Req() req: AuthenticatedRequest) { return this.academic.submitAssignment(id, input, req.user.sub).then(data => ({ success: true, data })); }
  @Post(':submissionId/unsubmit') unsubmit(@Param('submissionId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.unsubmit(id, req.user.sub).then(data => ({ success: true, data })); }
  @Get(':assessmentId/my-status') status(@Param('assessmentId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.myStatus(id, req.user.sub).then(data => ({ success: true, data })); }
  @Get(':id/student') getStudent(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getSubmissionForUser(id, req.user.sub).then(data => ({ success: true, data })); }
  @Get(':id/teacher') getTeacher(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getSubmissionForUser(id, req.user.sub).then(data => ({ success: true, data })); }
  @Post(':id/grade') grade(@Param('id') id: string, @Body() input: GradeSubmissionDto, @Req() req: AuthenticatedRequest) { return this.academic.grade(id, input, req.user.sub).then(data => ({ success: true, data })); }
  @Post(':id/feedback') feedback(@Param('id') id: string, @Body() input: FeedbackDto, @Req() req: AuthenticatedRequest) { return this.academic.addFeedback(id, input, req.user.sub).then(data => ({ success: true, data })); }
}

@UseGuards(JwtBoundaryGuard)
@Controller('file')
export class LegacyFileController {
  constructor(private readonly academic: AcademicService) {}
  @Get('presigned-url') presigned(@Query() input: NotifyUploadDto, @Req() req: AuthenticatedRequest) { return this.academic.presignedResource(input, req.user.sub).then(data => ({ success: true, data })); }
  @Post('notify-upload') notify(@Body() input: NotifyUploadDto, @Req() req: AuthenticatedRequest) { return this.academic.createResource(input, req.user.sub).then(resource => ({ success: true, data: { message: 'Resource saved successfully', resourceId: resource.id } })); }
  @Get('download/:resourceId') download(@Param('resourceId') id: string, @Req() req: AuthenticatedRequest) { return this.academic.getResource(id, req.user.sub).then(resource => ({ success: true, data: resource })); }
  @Get('cloudinary-presigned-url') cloudinary() { return { success: true, data: { signature: '', timestamp: Math.floor(Date.now() / 1000), folder: 'domrov-pictures' } }; }
}
