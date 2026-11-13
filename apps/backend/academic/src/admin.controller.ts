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

  @Get('dashboard/stats')
  dashboardStats(@Req() request: AuthenticatedRequest) {
    this.requireAdmin(request);
    return this.academic.getDashboardStats();
  }

  @Get('dashboard/recent-activity')
  async recentActivity(@Req() request: AuthenticatedRequest) {
    this.requireAdmin(request);
    return { activities: [] };
  }

  @Get('dashboard/users')
  async dashboardUsers(@Req() request: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    this.requireAdmin(request);
    return { data: [], total: 0, page: Math.max(1, Number(page) || 1), limit: Math.min(100, Math.max(1, Number(limit) || 20)), totalPages: 0, totalRecords: 0 };
  }

  @Get('dashboard/income-daily')
  async incomeDaily(@Req() request: AuthenticatedRequest) {
    this.requireAdmin(request);
    return { dailyData: [] };
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
    const role = String(request.user.role ?? '').toLowerCase();
    if (!['admin', 'administrator', 'super_admin', 'superadmin'].includes(role)) throw new ForbiddenException('Administrator access required');
  }
}
