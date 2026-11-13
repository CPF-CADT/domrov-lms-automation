import { Controller, Get, Param, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { AuthenticatedRequest, JwtBoundaryGuard } from './auth';

@UseGuards(JwtBoundaryGuard)
@Controller('admin')
export class AcademicAdminController {
  constructor(private readonly academic: AcademicService) {}

  @Get('dashboard')
  dashboard(@Req() request: AuthenticatedRequest) {
    this.requireAdmin(request);
    return this.academic.getDashboardStats();
  }

  @Get('evaluations')
  evaluations(@Req() request: AuthenticatedRequest, @Query('status') status?: string, @Query('assignmentId') assignmentId?: string, @Query('userId') userId?: string, @Query('limit') limit?: string) {
    this.requireAdmin(request);
    return this.academic.listEvaluationResults({ status, assignmentId, userId, limit: limit ? Number(limit) : undefined });
  }

  @Get('evaluations/:submissionId')
  evaluation(@Req() request: AuthenticatedRequest, @Param('submissionId') submissionId: string) {
    this.requireAdmin(request);
    return this.academic.getEvaluationResult(submissionId);
  }

  private requireAdmin(request: AuthenticatedRequest) {
    if (!['admin', 'administrator', 'super_admin'].includes(request.user.role ?? '')) throw new ForbiddenException('Administrator access required');
  }
}
