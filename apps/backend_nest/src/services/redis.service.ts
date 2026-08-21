import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        this.client = new Redis(redisUrl, {
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
    }

    getClient(): Redis {
        if (!this.client) throw new Error('Redis client not initialized');
        return this.client;
    }

    async pushToQueue(queueName: string, job: any) {
        await this.client.lpush(queueName, JSON.stringify(job));
    }

    async popFromQueue(queueName: string, timeout = 0): Promise<any | null> {
        const res = await this.client.brpop(queueName, timeout); // blocking pop
        if (!res) return null;
        const [, job] = res;
        return JSON.parse(job);
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
}