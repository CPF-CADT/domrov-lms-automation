import { Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    @SentryExceptionCaptured()
    catch(exception: unknown, host): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const status = exception instanceof HttpException ? exception.getStatus() : 500;
        const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
        res.status(status).json({ status: 'error', message });
    }

}   