import { createParamDecorator, ExecutionContext } from '@nestjs/common';

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