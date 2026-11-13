import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { urls: [config.get<string>('RABBITMQ_URL', 'amqp://domrov:domrov@localhost:5672')], queue: config.get<string>('RABBITMQ_ACADEMIC_QUEUE', 'academic-ai-events'), queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } });
  app.setGlobalPrefix('api/academic');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT ?? 3002));
}
bootstrap();
