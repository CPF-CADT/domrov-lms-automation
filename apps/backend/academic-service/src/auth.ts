import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtUser { sub: string; email?: string; role?: string; }
export type AuthenticatedRequest = Request & { user: JwtUser };

@Injectable()
export class JwtBoundaryGuard implements CanActivate {
  private readonly jwt: JwtService;
  constructor(config: ConfigService) { this.jwt = new JwtService({ secret: config.getOrThrow<string>('JWT_ACCESS_SECRET') }); }
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentication required');
    try { request.user = await this.jwt.verifyAsync<JwtUser>(token); return true; }
    catch { throw new UnauthorizedException('Invalid access token'); }
  }
}

export function currentUser(request: AuthenticatedRequest): JwtUser { return request.user; }
