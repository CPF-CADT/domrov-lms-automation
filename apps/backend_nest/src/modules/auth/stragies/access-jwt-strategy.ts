import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get('JWT_SECRET');
        if (!secret) throw new InternalServerErrorException('JWT secret is not defined!');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: secret,
            ignoreExpiration: false,
        });
    }

    async validate(payload: { sub: string; email: string }) {
        return { id: payload.sub, email: payload.email };
    }
}
