import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
        // Only log normal requests (<400)
        if (res.statusCode < 400) {
            console.log(
                `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - start
                }ms - IP: ${req.ip}`,
            );
        }
    });

    next();
}