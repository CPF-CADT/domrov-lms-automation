import { CanActivate, Controller, ExecutionContext, ForbiddenException, Get, NotFoundException, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { UserAiJwtGuard } from './user-ai.guard';

class AdminEvaluationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<{ user?: { role?: string } }>().user;
    if (!user) throw new UnauthorizedException('Authentication required');
    if (!['admin', 'superadmin', 'administrator', 'super_admin'].includes(String(user.role ?? '').toLowerCase())) throw new ForbiddenException('Administrator access required');
    return true;
  }
}

@Controller()
export class HttpController {
  constructor(private readonly evaluations: EvaluationService) {}
  @Get('health/live') live() { return { status: 'ok', service: 'evaluation-service' }; }
  @Get('health/ready') async ready() { await this.evaluations.health(); return { status: 'ok', service: 'evaluation-service', database: 'connected' }; }
  @Get('metrics') async metrics() { const rows = await this.evaluations.list(); const count = (s: string) => rows.filter((r) => r.status === s).length; return { service: 'evaluation-service', evaluations_total: rows.length, evaluations_queued: count('queued'), evaluations_running: count('running'), evaluations_completed: count('completed'), evaluations_failed: count('failed') }; }
  @Get('evaluations/quota')
  @UseGuards(UserAiJwtGuard)
  quota(@Req() request: { user?: { sub?: string } }) {
    if (!request.user?.sub) throw new UnauthorizedException('Authenticated user is missing');
    return this.evaluations.freeQuota(String(request.user.sub));
  }
  @Get('evaluations/:evaluationId') async get(@Param('evaluationId') id: string) { const record = await this.evaluations.find(id); if (!record) throw new NotFoundException('Evaluation not found'); return record; }
  @Get('admin/status') status() { return this.evaluations.list(); }

  @Get('admin/evaluations')
  @UseGuards(UserAiJwtGuard, AdminEvaluationGuard)
  async adminList(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    const all = (await this.evaluations.list()).filter((item) => !status || item.status === status);
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const data = all.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => ({ id: item.evaluationId, name: item.language, description: item.feedback ?? '', status: item.status, createdAt: item.createdAt }));
    return { data, total: all.length, page: currentPage, limit: pageSize };
  }

  @Get('admin/evaluations/ai-usage-logs')
  @UseGuards(UserAiJwtGuard, AdminEvaluationGuard)
  async aiUsageLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const rows = (await this.evaluations.list()).filter((item) => !!item.provider);
    return {
      data: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => ({
        evaluationId: item.evaluationId,
        userId: item.userId,
        provider: item.provider,
        model: item.model,
        status: item.status,
        inputTokenCount: item.promptTokens ?? 0,
        outputTokenCount: item.completionTokens ?? 0,
        totalTokenCount: (item.promptTokens ?? 0) + (item.completionTokens ?? 0),
        createdAt: item.createdAt,
      })),
      total: rows.length,
      page: currentPage,
      limit: pageSize,
      filtered: false,
    };
  }
}
