import { startHttpSpan, traceLogFields, withTraceContext } from '../telemetry';
import type { INestApplication, LoggerService } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { writeSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';

const service = 'evaluation-service';
const levels = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 } as const;
type Level = keyof typeof levels;
type Fields = Record<string, unknown>;
type LogContext = { request_id?: string; correlation_id?: string };

const context = new AsyncLocalStorage<LogContext>();
const loggedErrors = new WeakSet<object>();
const idPattern = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const tokenPattern = /^[a-z][a-z0-9_.-]{0,79}$/i;
const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const streamsWithErrorHandler = new WeakSet<NodeJS.WriteStream>();
const ignoreOutputFailure = () => undefined;
const stringFields = ['dependency', 'operation', 'outcome', 'error_code', 'routing_key', 'stage'];
const numberFields = ['duration_ms', 'status_code', 'attempt'];
const booleanFields = ['redelivered', 'requeue', 'aborted'];

export function safeId(value: unknown): string | undefined {
  return typeof value === 'string' && idPattern.test(value) ? value.toLowerCase() : undefined;
}

export function newId(): string {
  return randomUUID();
}

export function getLogContext(): LogContext {
  return context.getStore() ?? {};
}

export function withLogContext<T>(values: LogContext, fn: () => T): T {
  return context.run({
    request_id: safeId(values.request_id),
    correlation_id: safeId(values.correlation_id),
  }, fn);
}

function safeFields(fields: Fields): Fields {
  const record: Fields = {};
  for (const key of stringFields) {
    const value = fields[key];
    if (typeof value === 'string' && tokenPattern.test(value)) record[key] = value;
  }
  for (const key of numberFields) {
    const value = fields[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) record[key] = value;
  }
  for (const key of booleanFields) {
    if (typeof fields[key] === 'boolean') record[key] = fields[key];
  }
  const messageId = safeId(fields.message_id);
  if (messageId) record.message_id = messageId;
  return record;
}

function write(
  level: Level, event: string, message: string, fields: Fields = {}, http?: Fields, synchronous = false,
): void {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase() ?? 'info';
  const threshold = Object.prototype.hasOwnProperty.call(levels, configured) ? levels[configured as Level] : levels.info;
  if (levels[level] < threshold) return;

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service,
    event,
    message,
    ...getLogContext(),
    ...traceLogFields(),
    ...safeFields(fields),
    ...http,
  });
  // Log output is best effort. A closed container stream must not fail a request.
  try {
    if (synchronous) {
      writeSync(2, line + '\n');
      return;
    }
    const stream = levels[level] >= levels.error ? process.stderr : process.stdout;
    if (!streamsWithErrorHandler.has(stream)) {
      stream.on('error', ignoreOutputFailure);
      streamsWithErrorHandler.add(stream);
    }
    stream.write(line + '\n', ignoreOutputFailure);
  } catch {
    // The stream can also fail synchronously.
  }
}

// Event names and messages are fixed application text. Pass only classified metadata as fields.
export const logger = {
  debug: (event: string, message: string, fields?: Fields) => write('debug', event, message, fields),
  info: (event: string, message: string, fields?: Fields) => write('info', event, message, fields),
  warn: (event: string, message: string, fields?: Fields) => write('warn', event, message, fields),
  error: (event: string, message: string, fields?: Fields) => write('error', event, message, fields),
  fatal: (event: string, message: string, fields?: Fields) => write('fatal', event, message, fields),
};

export function installFatalLogging(): void {
  process.once('uncaughtException', (_error, origin) => {
    try {
      write('fatal', 'service.runtime.failed', 'Uncaught application failure', {
        operation: origin === 'unhandledRejection' ? 'unhandled_rejection' : 'uncaught_exception',
      }, undefined, true);
    } finally {
      // Keep the default fatal exit without writing an exception or stack to stderr.
      process.exit(1);
    }
  });
}

export function markErrorLogged(error: unknown): void {
  if (typeof error === 'object' && error !== null) loggedErrors.add(error);
}

export const nestLogger: LoggerService = {
  log() {},
  debug() {},
  verbose() {},
  warn(message: unknown, ...args: unknown[]) {
    const source = args.at(-1);
    if (source === 'ServerRMQ' || source === 'ClientRMQ') {
      // Connection state comes from the transport status observers.
      if (typeof message === 'string' && message.startsWith('RMQ broker has blocked the connection')) return;
      withLogContext({}, () => logger.warn('rabbitmq.transport.warning', 'RabbitMQ transport reported a warning', {
        dependency: 'rabbitmq',
      }));
      return;
    }
    logger.warn('framework.warning', 'Application framework reported a warning');
  },
  error(message: unknown, ...args: unknown[]) {
    const source = args.at(-1);
    // With abortOnError disabled, bootstrap reports the terminal initialization error.
    if (source === 'ExceptionHandler') return;
    if (source === 'ServerRMQ' || source === 'ClientRMQ') {
      if (message === 'Disconnected from RMQ. Trying to reconnect.' ||
          message === 'Connection to transport failed. Trying to reconnect...') return;

      withLogContext({}, () => {
        const fields = { dependency: 'rabbitmq' };
        if (typeof message === 'string') {
          logger.error('rabbitmq.transport.error', 'RabbitMQ transport reported an error', fields);
        } else {
          // A socket error can accompany an already logged status transition.
          logger.debug('rabbitmq.transport.error', 'RabbitMQ transport reported an error', fields);
        }
      });
      return;
    }
    if (
      (source === 'ExceptionsHandler' || source === 'RpcExceptionsHandler') &&
      typeof message === 'object' && message !== null && loggedErrors.delete(message)
    ) return;
    if (source === 'TypeOrmModule' && typeof message === 'string') {
      const retry = /^Unable to connect to the database(?: \([^)]+\))?\. Retrying \((\d+)\)\.\.\.$/.exec(message);
      if (retry) {
        logger.warn('dependency.connection.retry', 'Database connection attempt failed', {
          dependency: 'postgres',
          attempt: Number(retry[1]),
        });
        return;
      }
    }
    logger.error('framework.error', 'Application framework reported an error');
  },
  fatal() {
    write('fatal', 'framework.fatal', 'Application framework reported a fatal error');
  },
};

function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const requestId = safeId(req.headers['x-request-id']) ?? newId();
  const correlationId = safeId(req.headers['x-correlation-id']) ?? requestId;
  const values = { request_id: requestId, correlation_id: correlationId };
  res.setHeader('X-Request-ID', requestId);
  const start = performance.now();
  const method = methods.has(req.method) ? req.method : 'OTHER';
  const telemetry = startHttpSpan(method, req.headers);

  let completed = false;
  const complete = (aborted: boolean) => {
    if (completed) return;
    completed = true;
    const path: unknown = req.route?.path;
    const route = typeof path === 'string' ? path : 'unmatched';
    const status = aborted ? 499 : res.statusCode;
    const quiet = status < 400 && /(?:^|\/)(?:health(?:\/(?:live|ready))?|metrics)\/?$/.test(route);
    telemetry?.finish(route, status, aborted, quiet);
    if (quiet) return;
    withTraceContext(telemetry?.active, () => withLogContext(values, () => {
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      write(level, 'http.request.completed', 'HTTP request completed', {
        duration_ms: Math.round(performance.now() - start),
        status_code: status,
        aborted,
      }, {
        route,
        http_method: method,
      });
    }));
  };

  res.once('finish', () => complete(false));
  res.once('close', () => {
    if (!res.writableFinished) complete(true);
  });
  withTraceContext(telemetry?.active, () => withLogContext(values, next));
}

export function installHttpLogging(app: INestApplication): void {
  app.use(requestLogging);
}
