import { startHttpSpan, traceLogFields, withTraceContext } from '../telemetry';
import type { INestApplication, LoggerService } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { writeSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';

const service = 'evaluation-service';
const levels = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 } as const;
type Level = keyof typeof levels;
type Fields = Record<string, unknown>;
type LogContext = { request_id?: string; correlation_id?: string };
type RequestLog = { finished?: boolean; failure?: { level: Level; event: string; message: string; fields: Fields } };

const context = new AsyncLocalStorage<LogContext & { requestLog?: RequestLog }>();
const loggedErrors = new WeakSet<object>();
const idPattern = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const tokenPattern = /^[a-z][a-z0-9_.-]{0,79}$/i;
const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const streamsWithErrorHandler = new WeakSet<NodeJS.WriteStream>();
const ignoreOutputFailure = () => undefined;
const stringFields = ['dependency', 'operation', 'outcome', 'error_code', 'error_type', 'error_event', 'routing_key', 'stage'];
const numberFields = ['duration_ms', 'status_code', 'attempt'];
const booleanFields = ['redelivered', 'requeue', 'aborted'];
const applicationSourceRoot = resolve(__dirname, '..');
const sourceLocation = /^src\/[a-zA-Z0-9_./-]+\.(?:[cm]?js|ts):\d{1,7}:\d{1,7}$/;
const sourceFunction = /^[A-Za-z_$][A-Za-z0-9_$.<>-]{0,119}$/;
const errorSummaries = {
  TypeError: 'Unexpected type or missing value',
  ReferenceError: 'A variable or function was unavailable',
  RangeError: 'A value was out of range',
  SyntaxError: 'Input could not be parsed',
  QueryFailedError: 'Database query failed',
} as const;
const safeRuntimeMessage = "Cannot read properties of undefined (reading 'toLowerCase')";
const genericErrorSummary = 'Unexpected application exception';
const safeErrorMessages = new Set<string>([...Object.values(errorSummaries), safeRuntimeMessage, genericErrorSummary]);

export function safeId(value: unknown): string | undefined {
  return typeof value === 'string' && idPattern.test(value) ? value.toLowerCase() : undefined;
}

export function newId(): string {
  return randomUUID();
}

export function getLogContext(): LogContext {
  const { request_id, correlation_id } = context.getStore() ?? {};
  return { request_id, correlation_id };
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
  if (typeof fields.error_message === 'string' && safeErrorMessages.has(fields.error_message)) {
    record.error_message = fields.error_message;
  }
  if (typeof fields.error_location === 'string' && fields.error_location.length <= 160 && sourceLocation.test(fields.error_location)) {
    record.error_location = fields.error_location;
  }
  if (typeof fields.error_function === 'string' && sourceFunction.test(fields.error_function)) {
    record.error_function = fields.error_function;
  }
  return record;
}

function exceptionFields(error: unknown): Fields {
  if (!(error instanceof Error)) return { error_type: 'UnknownError', error_message: genericErrorSummary };

  const knownType = Object.prototype.hasOwnProperty.call(errorSummaries, error.name);
  const summary = knownType ? errorSummaries[error.name as keyof typeof errorSummaries] : genericErrorSummary;
  const fields: Fields = {
    error_type: knownType ? error.name : 'Error',
    error_message: error instanceof TypeError && error.message === safeRuntimeMessage ? safeRuntimeMessage : summary,
  };
  for (const line of error.stack?.split('\n').slice(1) ?? []) {
    const frame = /^\s+at (?:(?:async )?([^()]+?) \()?([^()]+):(\d+):(\d+)\)?$/.exec(line);
    if (!frame) continue;
    const [, name, filename, lineNumber, column] = frame;
    const file = relative(applicationSourceRoot, filename);
    if (file === '..' || file.startsWith(`..${sep}`) || resolve(applicationSourceRoot, file) !== filename) continue;
    const location = `src/${file.split(sep).join('/')}:${lineNumber}:${column}`;
    if (sourceLocation.test(location)) {
      fields.error_location = location;
      if (name && sourceFunction.test(name)) fields.error_function = name;
      break;
    }
  }
  return fields;
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

function writeException(level: Level, event: string, message: string, error: unknown, fields?: Fields): void {
  const details = { ...fields, ...exceptionFields(error) };
  const requestLog = context.getStore()?.requestLog;
  if (level !== 'fatal' && requestLog && !requestLog.finished) {
    if (!requestLog.failure || levels[level] > levels[requestLog.failure.level]) {
      requestLog.failure = { level, event, message, fields: details };
    }
    return;
  }
  write(level, event, message, details);
}

// Event names and messages are fixed application text. Pass only classified metadata as fields.
export const logger = {
  debug: (event: string, message: string, fields?: Fields) => write('debug', event, message, fields),
  info: (event: string, message: string, fields?: Fields) => write('info', event, message, fields),
  warn: (event: string, message: string, fields?: Fields) => write('warn', event, message, fields),
  error: (event: string, message: string, fields?: Fields) => write('error', event, message, fields),
  exception: (event: string, message: string, error: unknown, fields?: Fields, level: 'warn' | 'error' | 'fatal' = 'error') => {
    writeException(level, event, message, error, fields);
    markErrorLogged(error);
  },
  fatal: (event: string, message: string, fields?: Fields) => write('fatal', event, message, fields),
};

export function installFatalLogging(): void {
  process.once('uncaughtException', (error, origin) => {
    try {
      write('fatal', 'service.runtime.failed', 'Uncaught application failure', {
        operation: origin === 'unhandledRejection' ? 'unhandled_rejection' : 'uncaught_exception',
        ...exceptionFields(error),
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
    writeException('error', 'framework.error', 'Application framework reported an error', message);
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

  const requestLog: RequestLog = {};
  const complete = (aborted: boolean) => {
    if (requestLog.finished) return;
    requestLog.finished = true;
    const path: unknown = req.route?.path;
    const route = typeof path === 'string' ? path : 'unmatched';
    const status = aborted ? 499 : res.statusCode;
    const failure = requestLog.failure;
    const quiet = !failure && status < 400 && /(?:^|\/)(?:health(?:\/(?:live|ready))?|metrics)\/?$/.test(route);
    telemetry?.finish(route, status, aborted, quiet);
    if (quiet) return;
    withTraceContext(telemetry?.active, () => withLogContext(values, () => {
      const responseLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const level = failure && levels[failure.level] > levels[responseLevel] ? failure.level : responseLevel;
      write(level, 'http.request.completed', failure?.message ?? 'HTTP request completed', {
        ...failure?.fields,
        error_event: failure?.event,
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
  withTraceContext(telemetry?.active, () => context.run({ ...values, requestLog }, next));
}

export function installHttpLogging(app: INestApplication): void {
  app.use(requestLogging);
}
