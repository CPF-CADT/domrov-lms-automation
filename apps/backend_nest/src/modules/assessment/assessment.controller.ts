import {
  Body, Controller, Post, Get, Param, UploadedFiles, UseInterceptors, UseGuards, ParseIntPipe,
  Delete,
  Patch
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDTO } from '../../../libs/dtos/assessment/create-assessment.dto';
import { GradeSubmissionDTO } from '../../../libs/dtos/submission/grade-submission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../../common/decorators/user.decorator';
import { UpdateAssessmentDTO } from '../../../libs/dtos/assessment/update-assessment.dto';

@ApiTags('Assessments')
@Controller('assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) { }

  @Post()
  @ApiOperation({ summary: 'Create Assessment (Instructor)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5))
  async create(
    @UserId() userId: number,
    @Body() dto: CreateAssessmentDTO,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.assessmentService.createAssessment(userId, dto, files);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit Assignment (Student/Team)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async submit(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) assessmentId: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.assessmentService.submitAssignment(userId, assessmentId, files);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get Class Roster Status (Instructor)' })
  async getTracking(@Param('id', ParseIntPipe) assessmentId: number) {
    return this.assessmentService.getTracking(assessmentId);
  }

  @Post('submission/:id/grade')
  @ApiOperation({ summary: 'Grade Submission (Instructor)' })
  async grade(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() dto: GradeSubmissionDTO,
  ) {
    return this.assessmentService.gradeSubmission(userId, submissionId, dto);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'List all assignments for a class (Student Dashboard)' })
  async getAllByClass(@Param('classId', ParseIntPipe) classId: number) {
    return this.assessmentService.findAllByClass(classId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of one assignment (Instructions, Attachments)' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Teacher: Update assignment details' })
  async update(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssessmentDTO
  ) {
    return this.assessmentService.updateAssessment(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Teacher: Delete assignment' })
  async remove(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.assessmentService.deleteAssessment(userId, id);
  }

  @Get(':id/my-status')
  @ApiOperation({ summary: 'Student: Check my status (Handles Team Sync automatically)' })
  async getMyStatus(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) assessmentId: number
  ) {
    return this.assessmentService.getMySubmission(userId, assessmentId);
  }
  @Get(':id/students-status')
  @ApiOperation({ summary: 'Teacher: Get list of all students/teams with SUBMIT/NOT_SUBMIT status' })
  async getStudentStatusList(@Param('id', ParseIntPipe) assessmentId: number) {
    return this.assessmentService.getAssignmentRoster(assessmentId);
  }

  // 2. QUICK STATS (Nice to have)
  @Get(':id/stats')
  @ApiOperation({ summary: 'Teacher: Get count of submitted vs pending' })
  async getStats(@Param('id', ParseIntPipe) assessmentId: number) {
    return this.assessmentService.getAssessmentStats(assessmentId);
  }
}