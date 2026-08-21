import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuardService } from '../services/permission-guard.service';
import { TEAM_ID_KEY } from '../decorators/class.decorator';
import {
  AuthenticatedRequest,
  TeamContext,
  TeamIdParams,
  TeamIdQuery,
  TeamIdBody,
} from '../dtos/guard.dto';

@Injectable()
abstract class BaseTeamGuard implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly permissionService: PermissionGuardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get team ID param name from decorator or default to 'teamId'
    const teamIdParam = this.reflector.getAllAndOverride<string>(TEAM_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'teamId';

    // Extract teamId from params, query, or body
    const teamId = this.extractTeamId(request, teamIdParam);

    if (!teamId) {
      throw new NotFoundException('Team ID not provided');
    }

    // Get team context and attach to request
    const teamContext = await this.permissionService.getTeamContext(user.id, teamId);
    request.teamContext = teamContext ?? undefined;

    // Call subclass implementation
    return this.checkPermission(context, user.id, teamId, teamContext);
  }

  protected extractTeamId(
    request: AuthenticatedRequest,
    paramName: string,
  ): number | undefined {
    const params = request.params as TeamIdParams;
    const query = request.query as TeamIdQuery;
    const body = request.body as TeamIdBody;

    // Try route params
    if (params?.[paramName as keyof TeamIdParams]) {
      return parseInt(params[paramName as keyof TeamIdParams] as string, 10);
    }
    // Try query params
    if (query?.[paramName as keyof TeamIdQuery]) {
      return parseInt(query[paramName as keyof TeamIdQuery] as string, 10);
    }
    // Try body
    if (body?.[paramName as keyof TeamIdBody]) {
      return parseInt(String(body[paramName as keyof TeamIdBody]), 10);
    }
    // Try 'id' as fallback
    if (paramName === 'teamId' && params?.id) {
      return parseInt(params.id, 10);
    }
    return undefined;
  }

  protected abstract checkPermission(
    context: ExecutionContext,
    userId: number,
    teamId: number,
    teamContext: TeamContext | null,
  ): Promise<boolean>;
}

// Checks if user is a team member (approved or pending)
@Injectable()
export class TeamMemberGuard extends BaseTeamGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    teamId: number,
    teamContext: TeamContext | null,
  ): Promise<boolean> {
    if (!teamContext || !teamContext.isMember) {
      throw new ForbiddenException('You are not a member of this team');
    }
    return true;
  }
}

// Checks if user is an approved team member
@Injectable()
export class TeamApprovedMemberGuard extends BaseTeamGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    teamId: number,
    teamContext: TeamContext | null,
  ): Promise<boolean> {
    if (!teamContext || !teamContext.isMember) {
      throw new ForbiddenException('You are not a member of this team');
    }
    if (!teamContext.isApproved) {
      throw new ForbiddenException('Your team membership is pending approval');
    }
    return true;
  }
}

// Checks if user is the team leader
@Injectable()
export class TeamLeaderGuard extends BaseTeamGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    teamId: number,
    teamContext: TeamContext | null,
  ): Promise<boolean> {
    if (!teamContext || !teamContext.isLeader) {
      throw new ForbiddenException('Only the team leader can perform this action');
    }
    return true;
  }
}

// Checks if user can manage team (leader or class instructor)
@Injectable()
export class TeamManagerGuard extends BaseTeamGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    teamId: number,
    teamContext: TeamContext | null,
  ): Promise<boolean> {
    const canManage = await this.permissionService.canManageTeam(userId, teamId);
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage this team');
    }
    return true;
  }
}
