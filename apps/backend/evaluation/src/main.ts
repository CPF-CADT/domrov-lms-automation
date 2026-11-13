import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const c = app.get(ConfigService);
  const base = { urls: [c.getOrThrow<string>('RABBITMQ_URL')], exchange: c.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic' as const, wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 };
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { ...base, queue: c.get<string>('RABBITMQ_EVALUATION_QUEUE', 'domrov.evaluation.events') } });
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { ...base, queue: c.get<string>('RABBITMQ_EVALUATION_WORKER_QUEUE', 'domrov.evaluation.worker') } });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(Number(c.get('PORT', 3004)));
}
bootstrap();
