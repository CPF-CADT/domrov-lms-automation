import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh-jwt') {
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get('JWT_REFRESH_TOKEN_SECRET');
        if (!secret) throw new InternalServerErrorException('Refresh JWT secret is not defined!');
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.cookies?.refresh_token,
            ]),
            secretOrKey: secret,
            ignoreExpiration: false,
        });
    }

    async validate(payload: { sub: string; email: string }) {
        return { id: payload.sub, email: payload.email };
    }
}
