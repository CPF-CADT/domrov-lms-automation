import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimiterService {
    private readonly limit = 5; // max requests
    private readonly ttl = 60; // seconds

    constructor(private readonly redisService: RedisService) { }

    async isRateLimited(ip: string, route: string): Promise<boolean> {
        const redis = this.redisService.getClient();

        const key = `rate_limit:${route}:${ip}`;

        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, this.ttl);
        }

        return count > this.limit;
    }
}