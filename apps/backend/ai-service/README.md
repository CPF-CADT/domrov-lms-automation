# DOMROV AI Evaluation Service

This service preserves the evaluator implementation copied from `apps/code_eval` under `ai/`, `utils/`, and the legacy integration modules. The new service boundary is under `app/`.

## Runtime modes

```bash
python -m app.main          # HTTP health/metrics + gRPC API
python -m app.main worker   # Redis/RQ worker
python -m app.main rabbitmq-worker  # RabbitMQ evaluation.job worker
```

`SubmitEvaluation` persists a record in `ai_db`, enqueues an RQ job, and returns an evaluation ID without waiting for execution. The worker owns processing and calls Payment Service through `app/payment_client.py`; it never imports or queries payment persistence.

## Interfaces

- gRPC: `app/proto/evaluation.proto`, compatible with `contracts/ai/evaluation.proto`
- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Metrics: `GET /metrics`
- Status: `GET /evaluations/{evaluation_id}`
- Admin evaluation inspection: `GET /admin/evaluations` and `GET /admin/evaluations/{evaluation_id}`
- Admin usage summary: `GET /admin/usage`
- Admin lifecycle logs: `GET /admin/logs`

Admin endpoints require `X-Admin-Token` matching `AI_ADMIN_TOKEN`. They read only `ai_db`; Academic data remains behind the Academic Service API.

## Configuration

Copy `.env.example` to the runtime environment. `DATABASE_URL` defaults to SQLite for focused local tests; production must provide the service-owned `ai_db` PostgreSQL URL and run migrations before startup. Redis is used only for queue and transient job state.

## RabbitMQ migration worker

The `rabbitmq-worker` mode is compatible with the NestJS RabbitMQ migration
without changing the existing HTTP, gRPC, or Redis/RQ interfaces. It consumes
JSON `evaluation.job` messages from a durable `ai-evaluation-worker` queue and
calls the existing real evaluator through `app.worker.process_evaluation`.

The worker uses manual acknowledgements (`noAck=false`), `prefetch_count=1`,
durable messages, bounded retries, and a dead-letter queue. Retry deliveries
are published with `x-retry-count` and delayed through the durable retry queue.
After the retry budget is exhausted, the worker publishes `evaluation.failed`;
successful jobs publish `evaluation.completed`.

Both events include `messageId`, `correlationId`, `evaluationId`, `eventType`,
`producer`, and a `payload` containing the evaluation result or error.

Example job envelope:

```json
{
  "correlationId": "req-123",
  "evaluationId": "eval-123",
  "payload": {
    "evaluation_id": "eval-123",
    "submission_id": "sub-123",
    "assignment_id": "assignment-123",
    "user_id": "user-123",
    "resource_key": "submission.zip",
    "rubric": []
  }
}
```

RabbitMQ configuration includes `RABBITMQ_URL`, `RABBITMQ_EXCHANGE`,
`RABBITMQ_QUEUE`, `RABBITMQ_RETRY_DELAY_MS`, and `RABBITMQ_MAX_RETRIES`.
The default routing keys are `evaluation.job`, `evaluation.completed`, and
`evaluation.failed`.

## Focused checks

```bash
python -m compileall app
python -m pytest tests
```
