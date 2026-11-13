import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SystemRole } from '../entities/user.entity';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: { role?: SystemRole } }>();
    if (!request.user) throw new UnauthorizedException('Authentication required');
    if (![SystemRole.SUPER_ADMIN, SystemRole.ADMIN].includes(request.user.role as SystemRole)) {
      throw new ForbiddenException('Administrator role required');
    }
    return true;
  }
}

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: { role?: SystemRole } }>();
    if (!request.user) throw new UnauthorizedException('Authentication required');
    if (request.user.role !== SystemRole.SUPER_ADMIN) throw new ForbiddenException('SuperAdmin role required');
    return true;
  }
}
