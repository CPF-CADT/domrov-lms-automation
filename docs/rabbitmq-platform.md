# DOMROV RabbitMQ Platform

DOMROV uses RabbitMQ as the shared internal transport for NestJS microservice
events and commands. Public clients still use REST through the gateway. The
RabbitMQ layer is intentionally independent from service databases and service
entities.

This design follows NestJS's RabbitMQ transporter: services configure
`Transport.RMQ`, durable queues, `prefetchCount`, `persistent` messages, and
`noAck: false` for manual acknowledgements. NestJS uses `send()` with
`@MessagePattern()` for request-response and `emit()` with `@EventPattern()`
for event-based communication. See the [NestJS RabbitMQ documentation](https://docs.nestjs.com/microservices/rabbitmq).

## Local broker

`infra/docker-compose.yml` starts:

```text
rabbitmq:3.13-management-alpine
AMQP:       localhost:5672
Management: http://localhost:15672
User:       domrov
Password:   domrov
```

The management credentials are local-development defaults only. Override them
with `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`, `RABBITMQ_PORT`, and
`RABBITMQ_MANAGEMENT_PORT`.

The broker imports `infra/rabbitmq/definitions.json` on first initialization.
The definitions create durable exchanges, queues, bindings, retry queues, and
dead-letter queues. Because RabbitMQ persists definitions in its data volume,
recreate the volume when changing topology during local development, or apply
an explicit broker migration in a shared environment.

## Topology

```text
domrov.events   (topic) ── domain events
domrov.commands (direct) ── credit commands
domrov.retry    (topic) ── 30-second retry delay queues
domrov.dlx      (topic) ── terminal dead-letter queues
```

Queues are owned by their consumers:

| Queue | Consumer | Main routing key |
| --- | --- | --- |
| `domrov.ai.evaluation.requested` | AI orchestrator/worker | `evaluation.requested` |
| `domrov.academic.evaluation.completed` | Academic Service | `evaluation.completed` |
| `domrov.ai.evaluation.failed` | AI/admin workflow | `evaluation.failed` |
| `domrov.payment.commands` | Payment Service | `credit.*` |
| `domrov.auth.notifications` | Auth/notification handler | `notification.requested` |

Retry and `.dlq` queues are provisioned for each durable consumer queue.
Consumers must add an `x-retry-count` header or equivalent envelope field and
publish exhausted messages to the DLX instead of requeueing forever.

## Message rules

Every message must conform to the envelope and payload schemas in
`contracts/rabbitmq/`.

- Preserve `messageId` for deduplication.
- Preserve `correlationId` across a workflow and map `X-Request-Id` to it at
  the boundary.
- Set `causationId` to the message that caused the new message.
- Set `schemaVersion` and evolve payloads compatibly.
- Publish persistent messages to durable exchanges and queues.
- Do not put passwords, tokens, or provider credentials in payloads.

## Acknowledgement and retry policy

Consumers must acknowledge only after the service's own durable database work
has completed:

```text
success                         → ack
transient dependency failure    → nack/reject into retry flow
invalid or exhausted message    → reject without requeue → DLQ
duplicate idempotent message    → treat as already complete → ack
```

RabbitMQ's retry queues use a 30-second TTL before routing back to the main
exchange. The application controls the maximum retry count and should include
the failure code and original identifiers in the DLQ message. A DLQ is an
investigation boundary, not a silent data sink.

## Request-response commands

Credit operations use request-response semantics:

```text
AI Service --credit.reserve--> Payment Service
AI Service <--credit result--- Payment Service
```

Use NestJS `ClientProxy.send()` and `@MessagePattern()` for this flow. Every
credit command must carry the evaluation ID as the idempotency key, so a retry
cannot double-charge a user. Use explicit connect and response timeouts; a
timeout must leave the evaluation in a retryable/pending state.

## Event flow

Evaluation is asynchronous:

```text
Academic Service
  └─ evaluation.requested → RabbitMQ → AI Service/worker
                                      └─ evaluation.completed → Academic Service
                                      └─ evaluation.failed → retry/DLQ workflow
```

The HTTP submission endpoint returns an evaluation ID and does not wait for a
final score.

## Environment variables

| Variable | Local value |
| --- | --- | --- |
| `RABBITMQ_URL` | `amqp://domrov:domrov@rabbitmq:5672/%2f` |
| `RABBITMQ_EVENTS_EXCHANGE` | `domrov.events` |
| `RABBITMQ_COMMANDS_EXCHANGE` | `domrov.commands` |
| `RABBITMQ_RETRY_EXCHANGE` | `domrov.retry` |
| `RABBITMQ_DLX` | `domrov.dlx` |
| `RABBITMQ_PREFETCH_COUNT` | `10` |

The current Compose file passes these variables to each service as platform
configuration. Service behavior is intentionally unchanged by this platform
commit; the later service-integration work will bind NestJS clients and
consumers to these contracts.
