# DOMROV RabbitMQ Contracts

RabbitMQ is the internal transport for asynchronous events and service
commands. NestJS services use `Transport.RMQ` with durable queues and manual
acknowledgements (`noAck: false`). The Python evaluator consumes the same AMQP
contracts and does not access another service's database.

## Broker topology

```text
domrov.events   (topic) ── asynchronous domain events
domrov.commands (direct) ── request/response-style commands
domrov.retry    (topic) ── delayed retry queues
domrov.dlx      (topic) ── terminal dead-letter queues
```

The local topology is initialized from `infra/rabbitmq/definitions.json`.
Queues are durable and messages published by producers must be persistent.

## Routing keys

| Routing key | Producer | Consumer queue | Style |
| --- | --- | --- | --- |
| `evaluation.requested` | Academic Service | `domrov.ai.evaluation.requested` | event |
| `evaluation.completed` | AI Service | `domrov.academic.evaluation.completed` | event |
| `evaluation.failed` | AI Service | `domrov.ai.evaluation.failed` | event |
| `credit.reserve` | AI Service | `domrov.payment.commands` | command |
| `credit.commit` | AI Service | `domrov.payment.commands` | command |
| `credit.release` | AI Service | `domrov.payment.commands` | command |
| `notification.requested` | Any service | `domrov.auth.notifications` | event |

Retry routing keys append `.retry`. Terminal failures use the matching `.dlq`
routing key. Consumers must cap retries using the `x-retry-count` header or
message envelope before publishing to the DLX; the broker topology does not
permit infinite requeue loops.

## Common envelope

Every message uses the envelope in `envelope.schema.json`:

```json
{
  "messageId": "msg_123",
  "correlationId": "req_123",
  "causationId": "msg_122",
  "eventType": "evaluation.requested",
  "producer": "academic-service",
  "occurredAt": "2026-11-13T10:00:00.000Z",
  "schemaVersion": 1,
  "payload": {}
}
```

`correlationId` must be preserved across the complete workflow. `causationId`
links a message to the message that caused it. HTTP `X-Request-Id` should be
used as the initial correlation ID when one exists.

## Request-response and events

- Use NestJS `ClientProxy.send()` and `@MessagePattern()` for commands that
  require an immediate reply, such as credit reservation.
- Use NestJS `ClientProxy.emit()` and `@EventPattern()` for asynchronous events,
  such as evaluation completion.
- RabbitMQ's temporary reply-to queue may be used for request-response, but the
  command itself must still be idempotent.
- Long-running evaluation never waits for a final score in the HTTP request;
  it returns an evaluation ID and completes through an event.

## Acknowledgements and failures

Consumers run with `noAck: false` and acknowledge only after durable database
work completes. On a transient dependency failure, reject with requeue through
the retry queue. On validation or exhausted-retry failure, reject without
requeue and publish to the dead-letter exchange. Include the original
`messageId`, `correlationId`, and failure code in the DLQ message.

## Environment variables

| Variable | Local default | Purpose |
| --- | --- | --- |
| `RABBITMQ_URL` | `amqp://domrov:domrov@rabbitmq:5672/%2f` | AMQP connection URL |
| `RABBITMQ_DEFAULT_USER` | `domrov` | Local broker user only |
| `RABBITMQ_DEFAULT_PASS` | `domrov` | Local broker password only |
| `RABBITMQ_EVENTS_EXCHANGE` | `domrov.events` | Topic event exchange |
| `RABBITMQ_COMMANDS_EXCHANGE` | `domrov.commands` | Command exchange |
| `RABBITMQ_RETRY_EXCHANGE` | `domrov.retry` | Retry exchange |
| `RABBITMQ_DLX` | `domrov.dlx` | Terminal dead-letter exchange |
| `RABBITMQ_PREFETCH_COUNT` | `10` | Maximum unacknowledged deliveries per consumer |

Never use the local credentials in production. Store the production AMQP URL
in a secret manager or Kubernetes Secret.
