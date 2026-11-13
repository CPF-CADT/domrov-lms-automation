import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/ai-orchestrator');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.getOrThrow<string>('RABBITMQ_URL')],
      queue: config.get<string>('RABBITMQ_ORCHESTRATOR_QUEUE', 'ai-orchestrator'),
      queueOptions: { durable: config.get('RABBITMQ_QUEUE_DURABLE', 'true') === 'true' },
      noAck: false,
      prefetchCount: Number(config.get('RABBITMQ_PREFETCH_COUNT', 10)),
    },
  });
  await app.startAllMicroservices();
  await app.listen(Number(config.get('PORT', 3004)));
}

bootstrap();
