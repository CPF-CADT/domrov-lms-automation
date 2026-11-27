import 'reflect-metadata';
import { startTelemetry } from './telemetry';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ClientProxy, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Observable, Subscription } from 'rxjs';
import { installFatalLogging, installHttpLogging, logger, nestLogger, withLogContext } from './logging';
import { PAYMENT_EVENTS_CLIENT } from './messaging/payment-events';

function observeRabbitStatus(status: Observable<string>, operation: string): Subscription {
  return status.subscribe((outcome) => withLogContext({}, () => {
    const fields = { dependency: 'rabbitmq', operation, outcome };
    switch (outcome) {
      case 'connected':
      case 'unblocked':
        logger.info('dependency.connection', 'RabbitMQ available', fields);
        break;
      case 'disconnected':
      case 'blocked':
        logger.warn('dependency.connection', 'RabbitMQ unavailable', fields);
        break;
    }
  }));
}

async function bootstrap(): Promise<void> {
  const started = performance.now();
  let app: INestApplication | undefined;
  const subscriptions = new Subscription();
  let operation = 'load_module';
  logger.info('service.starting', 'Payment service starting');
  try {
    const { AppModule } = await import('./app.module.js');
    operation = 'initialize';
    app = await NestFactory.create(AppModule, { logger: nestLogger, abortOnError: false });
    logger.info('dependency.connection', 'Payment database connected', {
      dependency: 'postgres', outcome: 'connected',
    });
    const config = app.get(ConfigService);
    installHttpLogging(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    operation = 'start_rabbitmq';
    const commands = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [config.getOrThrow<string>('RABBITMQ_URL')],
        queue: config.get<string>('RABBITMQ_PAYMENT_QUEUE', 'domrov.payment.commands'),
        exchange: config.get<string>('RABBITMQ_COMMANDS_EXCHANGE', 'domrov.commands'),
        exchangeType: 'topic',
        wildcards: true,
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 10,
      },
    });
    subscriptions.add(observeRabbitStatus(commands.status, 'consume'));
    subscriptions.add(observeRabbitStatus(app.get<ClientProxy>(PAYMENT_EVENTS_CLIENT).status, 'publish'));
    await app.startAllMicroservices();

    operation = 'listen_http';
    await app.listen(Number(process.env.PORT ?? 3003));
    logger.info('service.ready', 'Payment service listening', { duration_ms: performance.now() - started });
  } catch (error) {
    logger.exception('service.startup.failed', 'Payment service failed to start', error, {
      operation, duration_ms: performance.now() - started,
    }, 'fatal');
    subscriptions.unsubscribe();
    process.exitCode = 1;
    await app?.close().catch(closeError => {
      logger.exception('service.shutdown_failed', 'Payment startup cleanup failed', closeError);
    });
  }
}

installFatalLogging();
startTelemetry('payment-service');
void bootstrap();
