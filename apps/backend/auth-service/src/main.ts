import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { urls: [config.get<string>('RABBITMQ_URL', 'amqp://domrov:domrov@localhost:5672')], queue: config.get<string>('RABBITMQ_AUTH_QUEUE', 'auth-commands'), queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } });
  app.use(cookieParser());
  app.enableCors({ origin: process.env.AUTH_CORS_ORIGIN ?? true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT ?? 3001));
}

bootstrap();
