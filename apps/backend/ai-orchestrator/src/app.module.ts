import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpController } from './http.controller';
import { OrchestrationService } from './orchestration.service';
import { RabbitMqController } from './rabbitmq.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'AI_WORKER_EVENTS',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.get<string>('RABBITMQ_WORKER_QUEUE', 'ai-evaluation-worker'),
            queueOptions: { durable: config.get('RABBITMQ_QUEUE_DURABLE', 'true') === 'true' },
            persistent: true,
          },
        }),
      },
    ]),
  ],
  controllers: [HttpController, RabbitMqController],
  providers: [OrchestrationService],
})
export class AppModule {}
