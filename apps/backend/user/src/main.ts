import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ReadinessService } from './health/readiness.service';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  try {
    const config = app.get(ConfigService);
    const rabbitmq = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [config.getOrThrow<string>('RABBITMQ_URL')],
        queue: config.get<string>('RABBITMQ_AUTH_QUEUE', 'auth-commands'),
        exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'),
        exchangeType: 'topic',
        wildcards: true,
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 10,
      },
    });
    app.get(ReadinessService).observeRabbitMq(rabbitmq.status);
    app.enableShutdownHooks();
    app.use(cookieParser());
    app.enableCors({ origin: config.get<string>('AUTH_CORS_ORIGIN') || true, credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.startAllMicroservices();
    await app.listen(Number(config.get('PORT', 3001)));
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

if (require.main === module) {
  void bootstrap().catch(() => {
    Logger.error('User service startup failed; check configuration and dependency availability', 'Bootstrap');
    process.exitCode = 1;
  });
}
