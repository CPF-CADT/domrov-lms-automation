import 'reflect-metadata';
import { startTelemetry } from './telemetry';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { distinctUntilChanged } from 'rxjs';
import { AppModule } from './app.module';
import { installFatalLogging, installHttpLogging, logger, nestLogger } from './logging';

async function bootstrap(startup: { startedAt: number; stage: string }) {
  logger.info('service.starting', 'Starting user service');
  const app = await NestFactory.create(AppModule, { logger: nestLogger, abortOnError: false });
  logger.info('dependency.connected', 'PostgreSQL initialized', { dependency: 'postgres' });
  startup.stage = 'configuration';
  const config = app.get(ConfigService);
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const secret = config.get<string>(key);
      if (!secret || secret.length < 32 || secret.startsWith('local-')) {
        throw new Error(`${key} must be a unique secret with at least 32 characters in production`);
      }
    }
  }
  const transport = app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { urls: [config.getOrThrow<string>('RABBITMQ_URL')], queue: config.get<string>('RABBITMQ_AUTH_QUEUE', 'auth-commands'), exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic', wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } });
  transport.status.pipe(distinctUntilChanged()).subscribe((status) => {
    const fields = { dependency: 'rabbitmq', operation: 'consume', outcome: status };
    switch (status) {
      case 'connected':
      case 'unblocked':
        logger.info('dependency.available', 'RabbitMQ consumer transport is available', fields);
        break;
      case 'disconnected':
      case 'blocked':
        logger.warn('dependency.unavailable', 'RabbitMQ consumer transport is unavailable', fields);
        break;
    }
  });
  installHttpLogging(app);
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
  startup.stage = 'rabbitmq_start';
  await app.startAllMicroservices();
  startup.stage = 'http_listen';
  await app.listen(Number(process.env.PORT ?? 3001));
  logger.info('service.ready', 'User service is ready', { duration_ms: performance.now() - startup.startedAt });
}

installFatalLogging();
startTelemetry('user');
const startup = { startedAt: performance.now(), stage: 'application_init' };
void bootstrap(startup).catch(error => {
  logger.exception('service.startup.failed', 'User service startup failed', error, { stage: startup.stage, duration_ms: performance.now() - startup.startedAt }, 'fatal');
  process.stderr.write('', () => process.exit(1));
});
