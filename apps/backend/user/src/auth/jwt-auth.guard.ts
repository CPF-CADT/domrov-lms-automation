import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject('ACCESS_JWT_SERVICE') private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentication required');
    try {
      request.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
