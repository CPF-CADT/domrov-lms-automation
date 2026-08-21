import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class PerformanceSentryInterceptor implements NestInterceptor {
    private logger: winston.Logger;
    private readonly consoleLogger = new Logger('PERF'); // use unique context

    constructor() {
        const logDir = '/logs';

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const transport = new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'perf-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            zippedArchive: true,
        });

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [transport],
        });
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const startHrTime = process.hrtime();

        // Ensure this fires only once per request
        res.once('finish', () => {
            const diff = process.hrtime(startHrTime);
            const durationMs = diff[0] * 1000 + diff[1] / 1e6;

            const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
                req.ip ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                'unknown';

            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                route: req.originalUrl,
                status: res.statusCode,
                responseTimeMs: durationMs.toFixed(2),
                userId: req.user?.id || 'N/A',
                ip,
            };

            // 1️⃣ Log to Winston
            this.logger.info(logData);

            // 2️⃣ Log to console
            this.consoleLogger.log(
                `${logData.method} ${logData.route} - ${logData.status} - ${logData.responseTimeMs}ms - User: ${logData.userId} - IP: ${logData.ip}`
            );

            // 3️⃣ Send to Sentry if:
            // - Error (status >= 500)
            // - Slow request (optional threshold, e.g., >100ms)
            if (res.statusCode >= 500 || durationMs > 100) {
                Sentry.captureMessage(
                    `Request ${logData.method} ${logData.route} - Status: ${logData.status} - ${logData.responseTimeMs}ms - IP: ${logData.ip}`,
                    res.statusCode >= 500 ? 'error' : 'warning'
                );
            }
        });

        return next.handle();
    }
}