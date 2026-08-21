import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OAuthProfile } from '../../libs/dtos/auth/oauth-profile.interface';

export const User = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        const user = req.user;
        if (!user) return null;
        return data ? user[data] : user;
    },
);

export const UserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest();
        return request.user.id;
    },
);

export const OAuthProfileDecorator = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext): OAuthProfile | string | null => {
        const req = ctx.switchToHttp().getRequest();
        const profile: OAuthProfile = req.user;

        if (!profile) return null;

        // If a specific field is requested, return only that
        return data ? profile[data as keyof OAuthProfile] : profile;
    },
);