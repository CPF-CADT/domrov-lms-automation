import 'reflect-metadata';
import { startTelemetry } from './telemetry';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Observable, Subscription } from 'rxjs';
import { AppModule } from './app.module';
import { installFatalLogging, installHttpLogging, logger, nestLogger, withLogContext } from './logging';

function observeRabbitConnection(
  connection: { status: Observable<unknown>; on(event: string, callback: () => void): void },
  operation: string,
): Subscription {
  const fields = { dependency: 'rabbitmq', operation };
  let wasConnected = false;
  const statuses = connection.status.subscribe((status) => withLogContext({}, () => {
    switch (status) {
      case 'connected':
        wasConnected = true;
        logger.info('dependency.connected', 'RabbitMQ connection established', fields);
        break;
      case 'unblocked':
        logger.info('dependency.unblocked', 'RabbitMQ connection unblocked', fields);
        break;
      case 'disconnected':
        if (wasConnected) logger.warn('dependency.disconnected', 'RabbitMQ connection unavailable', fields);
        break;
      case 'blocked':
        logger.warn('dependency.blocked', 'RabbitMQ connection blocked', fields);
    }
  }));
  let lastRetryLogged = -Infinity;
  connection.on('connectFailed', () => withLogContext({}, () => {
    const now = performance.now();
    if (now - lastRetryLogged < 30_000) return;
    lastRetryLogged = now;
    logger.warn('dependency.connection.retry', 'RabbitMQ connection attempt failed', fields);
  }));
  return statuses;
}

async function bootstrap() {
  const startedAt = performance.now();
  const connections = new Subscription();
  let app: INestApplication | undefined;
  let stage = 'initialize';
  logger.info('service.starting', 'Evaluation service is starting');
  try {
    app = await NestFactory.create(AppModule, { logger: nestLogger, abortOnError: false });
    logger.info('dependency.connected', 'PostgreSQL connection established', { dependency: 'postgres' });
    const c = app.get(ConfigService);
    stage = 'rabbitmq';
    const base = { urls: [c.getOrThrow<string>('RABBITMQ_URL')], exchange: c.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'), exchangeType: 'topic' as const, wildcards: true, queueOptions: { durable: true }, noAck: false, prefetchCount: 10 };
    const requested = app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { ...base, queue: c.get<string>('RABBITMQ_EVALUATION_QUEUE', 'domrov.evaluation.events') } });
    const worker = app.connectMicroservice<MicroserviceOptions>({ transport: Transport.RMQ, options: { ...base, queue: c.get<string>('RABBITMQ_EVALUATION_WORKER_QUEUE', 'domrov.evaluation.worker') } });
    connections.add(observeRabbitConnection(requested, 'evaluation_requests'));
    connections.add(observeRabbitConnection(worker, 'evaluation_worker'));
    connections.add(observeRabbitConnection(app.get<ClientProxy>('EVALUATION_EVENTS'), 'evaluation_publisher'));
    connections.add(observeRabbitConnection(app.get<ClientProxy>('PAYMENT_COMMANDS'), 'payment_client'));
    installHttpLogging(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.startAllMicroservices();
    stage = 'http';
    await app.listen(Number(c.get('PORT', 3004)));
    logger.info('service.ready', 'Evaluation service is ready', { duration_ms: performance.now() - startedAt });
  } catch (error) {
    logger.exception('service.startup.failed', 'Evaluation service failed to start', error, {
      stage,
      error_code: 'BOOTSTRAP_FAILED',
      duration_ms: performance.now() - startedAt,
    }, 'fatal');
    connections.unsubscribe();
    process.exitCode = 1;
    await app?.close().catch(closeError => {
      logger.exception('service.shutdown_failed', 'Evaluation startup cleanup failed', closeError);
    });
  }
}

installFatalLogging();
startTelemetry('evaluation-service');
void bootstrap();
