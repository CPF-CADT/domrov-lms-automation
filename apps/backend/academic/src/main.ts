import 'reflect-metadata';
import { startTelemetry } from './telemetry';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientRMQ, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { distinctUntilChanged, Observable } from 'rxjs';
import { AppModule } from './app.module';
import { installFatalLogging, installHttpLogging, logger, nestLogger, withLogContext } from './logging';
import { AI_RABBITMQ_CLIENT, EXECUTION_RABBITMQ_CLIENT } from './messaging/rabbitmq';

async function bootstrap() {
  const startedAt = performance.now();
  let app: INestApplication | undefined;
  let stage = 'initialization';
  logger.info('service.starting', 'Academic service starting');
  try {
    app = await NestFactory.create(AppModule, { logger: nestLogger, abortOnError: false });
    logger.info('dependency.connected', 'Database connection ready', { dependency: 'postgres' });
    const config = app.get(ConfigService);
    stage = 'rabbitmq';
    const broker = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [config.getOrThrow<string>('RABBITMQ_URL')],
        queue: config.get<string>('RABBITMQ_ACADEMIC_QUEUE', 'domrov.academic.evaluation.completed'),
        exchange: config.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events'),
        exchangeType: 'topic',
        wildcards: true,
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 10,
      },
    });
    logBrokerStatus(broker.status, 'evaluation_results');
    let lastRetryLog = -Infinity;
    broker.on('connectFailed', () => {
      const time = performance.now();
      if (time - lastRetryLog < 30_000) return;
      lastRetryLog = time;
      logger.warn('dependency.connection.retry', 'RabbitMQ consumer connection attempt failed', { dependency: 'rabbitmq', operation: 'evaluation_results' });
    });
    logBrokerStatus(app.get<ClientRMQ>(AI_RABBITMQ_CLIENT).status, 'evaluation_publisher');
    logBrokerStatus(app.get<ClientRMQ>(EXECUTION_RABBITMQ_CLIENT).status, 'execution_publisher');
    app.setGlobalPrefix('api/academic');
    installHttpLogging(app);
    app.enableCors({ origin: process.env.AUTH_CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.startAllMicroservices();
    stage = 'http';
    const port = Number(process.env.PORT ?? 3002);
    await app.listen(port);
    logger.info('service.ready', 'Academic service listening', { duration_ms: Math.round(performance.now() - startedAt) });
  } catch {
    logger.fatal('service.startup.failed', 'Academic service failed to start', { stage, duration_ms: Math.round(performance.now() - startedAt) });
    process.exitCode = 1;
    await app?.close().catch(() => {
      logger.error('service.shutdown_failed', 'Academic service could not close after startup failure');
    });
  }
}

function logBrokerStatus(statuses: Observable<string>, connection: string) {
  let connectedBefore = false;
  statuses.pipe(distinctUntilChanged()).subscribe(status => withLogContext({}, () => {
    const fields = { dependency: 'rabbitmq', operation: connection };
    switch (status) {
      case 'connected':
        connectedBefore = true;
        logger.info('dependency.connected', 'RabbitMQ connection ready', fields);
        break;
      case 'disconnected':
        if (connectedBefore) logger.warn('dependency.disconnected', 'RabbitMQ connection unavailable', fields);
        break;
      case 'blocked': logger.warn('dependency.blocked', 'RabbitMQ connection blocked', fields); break;
      case 'unblocked': logger.info('dependency.unblocked', 'RabbitMQ connection unblocked', fields); break;
    }
  }));
}

installFatalLogging();
startTelemetry('academic-service');
void bootstrap();
