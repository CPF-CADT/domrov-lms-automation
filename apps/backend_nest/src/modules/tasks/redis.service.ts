import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST') || 'redis',
            port: this.configService.get<number>('REDIS_PORT') || 6379,
            retryStrategy: (times) => Math.min(times * 50, 2000), 
        });
    }

    async pushToQueue(queueName: string, job: any) {
        await this.client.lpush(queueName, JSON.stringify(job));
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
}
