import { context, isSpanContextValid, ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Attributes, Context, Span } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { ExportResultCode, W3CTraceContextPropagator } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { performance } from 'node:perf_hooks';

type Attribute = string | number;
type Dimensions = Record<string, Attribute>;
type Headers = Record<string, unknown> | undefined;
const scope = { name: 'domrov.application' };
const tracePropagator = new W3CTraceContextPropagator();
const propagatorGetter = {
  keys: (carrier: Headers) => carrier ? Object.keys(carrier) : [],
  get: (carrier: Headers, key: string) => {
    const value = carrier?.[key];
    return key === 'traceparent' && typeof value === 'string' && value.length <= 100 ? value : undefined;
  },
};
const propagatorSetter = {
  set: (carrier: Record<string, string>, key: string, value: string) => {
    if (key === 'traceparent') carrier[key] = value;
  },
};
const allowedAttributeKeys = [
  'http.request.method', 'http.route', 'http.response.status_code',
  'messaging.system', 'messaging.operation.type', 'messaging.destination.name', 'error.type',
];
const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const maxSeries = 256;
const metricIntervalMs = 10_000;

function attributes(values: Attributes) {
  return allowedAttributeKeys.flatMap<{ key: string; value: { intValue?: string; stringValue?: string } }>(key => {
    const value = values[key];
    if (typeof value === 'number' && Number.isSafeInteger(value)) return [{ key, value: { intValue: String(value) } }];
    if (typeof value === 'string' && /^[A-Za-z0-9 /_.:{}()*-]{1,160}$/.test(value)) return [{ key, value: { stringValue: value } }];
    return [];
  });
}

function epochNanos(time: [number, number]): string {
  return String(BigInt(time[0]) * 1_000_000_000n + BigInt(time[1]));
}

function nowNanos(): string {
  return String(BigInt(Date.now()) * 1_000_000n);
}

type Target = { endpoint: URL; resource: { attributes: Array<{ key: string; value: { stringValue: string } }> } };
type Histogram = {
  name: string; dimensions: Dimensions; count: number; sum: number;
  min: number; max: number; bucketCounts: number[];
};
let target: Target | undefined;
let tracer: ReturnType<BasicTracerProvider['getTracer']> | undefined;
let metricsSince = nowNanos();
const series = new Map<string, Histogram>();
let metricsInFlight = false;

async function send(destination: Target, signal: 'traces' | 'metrics', payload: object): Promise<void> {
  const url = new URL(destination.endpoint);
  url.pathname = url.pathname.replace(/\/+$/, '') + '/v1/' + signal;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3_000),
    redirect: 'error',
  });
  await response.body?.cancel();
  if (!response.ok) throw new Error('OTLP export failed');
}

class HttpTraceExporter implements SpanExporter {
  constructor(private readonly destination: Target) {}

  export(spans: ReadableSpan[], done: (result: ExportResult) => void): void {
    const encoded = spans.filter(span => span.attributes['domrov.probe.muted'] !== true).map(span => ({
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanContext?.spanId,
      name: span.name,
      kind: span.kind + 1,
      startTimeUnixNano: epochNanos(span.startTime),
      endTimeUnixNano: epochNanos(span.endTime),
      attributes: attributes(span.attributes),
      status: { code: span.status.code },
    }));
    if (!encoded.length) {
      done({ code: ExportResultCode.SUCCESS });
      return;
    }
    void send(this.destination, 'traces', {
      resourceSpans: [{ resource: this.destination.resource, scopeSpans: [{ scope, spans: encoded }] }],
    }).then(
      () => done({ code: ExportResultCode.SUCCESS }),
      () => done({ code: ExportResultCode.FAILED }),
    );
  }

  shutdown(): Promise<void> { return Promise.resolve(); }
}

function record(name: string, dimensions: Dimensions, seconds: number): void {
  if (!target) return;
  const key = JSON.stringify([name, dimensions]);
  let point = series.get(key);
  if (!point) {
    if (series.size >= maxSeries) return;
    point = { name, dimensions, count: 0, sum: 0, min: seconds, max: seconds, bucketCounts: Array(buckets.length + 1).fill(0) };
    series.set(key, point);
  }
  point.count++;
  point.sum += seconds;
  point.min = Math.min(point.min, seconds);
  point.max = Math.max(point.max, seconds);
  const bucket = buckets.findIndex(bound => seconds <= bound);
  point.bucketCounts[bucket < 0 ? buckets.length : bucket]++;
}

async function flushMetrics(): Promise<void> {
  if (!target || metricsInFlight || !series.size) return;
  metricsInFlight = true;
  const end = nowNanos();
  try {
    const dataPoints = Array.from(series.values(), point => ({
      name: point.name,
      point: {
        attributes: attributes(point.dimensions), startTimeUnixNano: metricsSince, timeUnixNano: end,
        count: String(point.count), sum: point.sum, min: point.min, max: point.max,
        explicitBounds: buckets, bucketCounts: point.bucketCounts.map(String),
      },
    }));
    const names = new Set(dataPoints.map(item => item.name));
    const metrics = Array.from(names, name => ({
      name,
      unit: 's',
      histogram: {
        aggregationTemporality: 2,
        dataPoints: dataPoints.filter(item => item.name === name).map(item => item.point),
      },
    }));
    await send(target, 'metrics', {
      resourceMetrics: [{ resource: target.resource, scopeMetrics: [{ scope, metrics }] }],
    });
  } catch {
    // Collector availability has no effect on business operations.
  } finally {
    metricsInFlight = false;
  }
}

export function startTelemetry(service: string): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (target || !endpoint || process.env.OTEL_SDK_DISABLED?.toLowerCase() === 'true') return;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return;
  const resource = { attributes: [{ key: 'service.name', value: { stringValue: service } }] };
  const destination: Target = { endpoint: url, resource };
  const manager = new AsyncLocalStorageContextManager().enable();
  if (!context.setGlobalContextManager(manager)) {
    manager.disable();
    return;
  }
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ 'service.name': service }),
    spanProcessors: [new BatchSpanProcessor(new HttpTraceExporter(destination), {
      maxQueueSize: 256, maxExportBatchSize: 64, scheduledDelayMillis: 2_000, exportTimeoutMillis: 4_000,
    })],
  });
  tracer = provider.getTracer(scope.name);
  target = destination;
  metricsSince = nowNanos();
  setInterval(() => void flushMetrics(), metricIntervalMs).unref();
  process.once('beforeExit', () => {
    void Promise.allSettled([flushMetrics(), provider.shutdown()]);
  });
}

export function traceLogFields(): Record<string, string> {
  const active = trace.getSpan(context.active())?.spanContext();
  return active && isSpanContextValid(active) ? { trace_id: active.traceId, span_id: active.spanId } : {};
}

export function startHttpSpan(method: string, headers: Headers): { active: Context; finish: (route: string, status: number, aborted: boolean, quiet: boolean) => void } | undefined {
  if (!tracer) return;
  const parent = tracePropagator.extract(ROOT_CONTEXT, headers, propagatorGetter);
  const started = performance.now();
  const span = tracer.startSpan(method, { kind: SpanKind.SERVER }, parent);
  return {
    active: trace.setSpan(parent, span),
    finish: (route, status, aborted, quiet) => {
      if (quiet) {
        span.setAttribute('domrov.probe.muted', true);
        span.end();
        return;
      }
      const safeRoute = route.startsWith('/') && /^[A-Za-z0-9 /_.:{}()*-]{1,160}$/.test(route) ? route : 'unmatched';
      const dimensions: Dimensions = { 'http.request.method': method, 'http.route': safeRoute, 'http.response.status_code': status };
      if (status >= 500 || aborted) {
        dimensions['error.type'] = aborted ? 'aborted' : String(status);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.setAttributes(dimensions);
      span.updateName(method + ' ' + safeRoute);
      span.end();
      record('http.server.request.duration', dimensions, (performance.now() - started) / 1_000);
    },
  };
}

export function amqpHeaders(requestId?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (requestId) headers['x-request-id'] = requestId;
  if (tracer) tracePropagator.inject(context.active(), headers, propagatorSetter);
  return headers;
}

export function markTelemetryFailure(): void {
  const span = tracer && trace.getSpan(context.active());
  span?.setStatus({ code: SpanStatusCode.ERROR });
  span?.setAttribute('error.type', 'operation_failed');
}

export async function withMessagingSpan<T>(
  operation: 'publish' | 'process', route: string, headers: Headers, run: () => Promise<T>,
): Promise<T> {
  if (!tracer) return run();
  const safeRoute = /^[a-z][a-z0-9._-]{0,79}$/.test(route) ? route : 'unknown';
  const dimensions = {
    'messaging.system': 'rabbitmq',
    'messaging.operation.type': operation === 'publish' ? 'send' : operation,
    'messaging.destination.name': safeRoute,
  };
  const parent = operation === 'process' ? tracePropagator.extract(ROOT_CONTEXT, headers, propagatorGetter) : context.active();
  const started = performance.now();
  const span: Span = tracer.startSpan(operation + ' ' + safeRoute, {
    kind: operation === 'publish' ? SpanKind.PRODUCER : SpanKind.CONSUMER,
    attributes: dimensions,
  }, parent);
  return context.with(trace.setSpan(parent, span), async () => {
    try {
      return await run();
    } catch (error) {
      markTelemetryFailure();
      throw error;
    } finally {
      span.end();
      record(operation === 'process' ? 'messaging.process.duration' : 'messaging.client.operation.duration',
        dimensions, (performance.now() - started) / 1_000);
    }
  });
}

export function withTraceContext<T>(active: Context | undefined, run: () => T): T {
  return active ? context.with(active, run) : run();
}
