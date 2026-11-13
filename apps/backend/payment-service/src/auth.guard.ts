import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
@Injectable() export class JwtBoundaryGuard implements CanActivate { constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {} async canActivate(ctx: ExecutionContext) { const req = ctx.switchToHttp().getRequest(); const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException('Authentication required'); try { req.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') }); return true; } catch { throw new UnauthorizedException('Invalid access token'); } } }
@Injectable() export class ServiceAuthGuard implements CanActivate { constructor(private readonly config: ConfigService) {} canActivate(ctx: ExecutionContext) { const token = ctx.switchToHttp().getRequest().headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token || token !== this.config.getOrThrow('SERVICE_AUTH_TOKEN')) throw new UnauthorizedException('Invalid service credentials'); return true; } }

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const role = String(ctx.switchToHttp().getRequest().user?.role ?? '').toLowerCase();
    if (!['admin', 'superadmin'].includes(role)) throw new UnauthorizedException('Administrator access required');
    return true;
  }
}
