import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class SimpleExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        const status = exception instanceof HttpException ? exception.getStatus() : 500;
        const message = exception instanceof HttpException ? exception.getResponse() : exception;
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.confirmPassword;
        delete sanitizedBody.otp;
        delete sanitizedBody.currentPassword;
        delete sanitizedBody.newPassword;

        console.error({
            timestamp: new Date().toISOString(),
            path: req.url,
            method: req.method,
            ip: req.ip,
            body: sanitizedBody,
            status,
            error: message,
            stack: exception instanceof Error ? exception.stack : null,
        });

        res.status(status).json({ success: false, message: 'Internal Server Error' });
    }
}