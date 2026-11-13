import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { urls: [config.getOrThrow<string>('RABBITMQ_URL')], queue: config.get<string>('RABBITMQ_ACADEMIC_QUEUE', 'domrov.academic.evaluation.completed'), exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic', wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } });
  app.setGlobalPrefix('api/academic');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT ?? 3002));
}
bootstrap();
