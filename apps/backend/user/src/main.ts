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
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const secret = config.get<string>(key);
      if (!secret || secret.length < 32 || secret.startsWith('local-')) {
        throw new Error(`${key} must be a unique secret with at least 32 characters in production`);
      }
    }
  }
  app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { urls: [config.getOrThrow<string>('RABBITMQ_URL')], queue: config.get<string>('RABBITMQ_AUTH_QUEUE', 'auth-commands'), exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic', wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } });
  app.use(cookieParser());
  const corsOrigin = config.get<string>('AUTH_CORS_ORIGIN') ?? (process.env.NODE_ENV === 'production' ? undefined : true);
  if (process.env.NODE_ENV === 'production') {
    if (!corsOrigin || typeof corsOrigin !== 'string') throw new Error('AUTH_CORS_ORIGIN is required in production');
    let origin: URL;
    try { origin = new URL(corsOrigin); }
    catch { throw new Error('AUTH_CORS_ORIGIN must be a valid origin URL'); }
    if (origin.origin !== corsOrigin || origin.protocol !== 'https:') {
      throw new Error('AUTH_CORS_ORIGIN must be an HTTPS origin without a path in production');
    }
  }
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.startAllMicroservices();
  await app.listen(Number(process.env.PORT ?? 3001));
}

bootstrap();
