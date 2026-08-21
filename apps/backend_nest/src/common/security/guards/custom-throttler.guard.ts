import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ResponseUtil } from '../../../util/response.util';
import { RateLimiterService } from '../../../services/rate-limiter.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
    constructor(private readonly rateLimiterService: RateLimiterService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Get real IP (supports proxies)
        const ip =
            request.headers['x-forwarded-for']?.split(',')[0] ||
            request.socket?.remoteAddress ||
            request.ip;

        // Route name for rate limit separation
        const route = request.route?.path || request.url;

        const isRateLimited = await this.rateLimiterService.isRateLimited(ip, route);

        if (isRateLimited) {
            response
                .status(429)
                .json(
                    ResponseUtil.error(
                        429,
                        'Too many requests from this IP. Please try again later.',
                    ),
                );

            return false;
        }

        return true;
    }
}