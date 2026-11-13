# AI Orchestrator

NestJS-first orchestration microservice for DOMROV's RabbitMQ evaluation workflow.

## Responsibilities

- Consume `evaluation.requested` from RabbitMQ.
- Create an orchestration record and publish `evaluation.job` for the existing Python evaluator worker.
- Consume `evaluation.completed` and `evaluation.failed`.
- Expose HTTP health, metrics, and admin status endpoints.

The Python evaluator remains the worker and is intentionally not modified by this service. The orchestrator keeps transient correlation state in memory; durable evaluation results remain owned by the existing Python AI service and its `ai_db`. This avoids introducing a second owner for evaluation data.

## RabbitMQ messages

Incoming patterns:

```text
evaluation.requested
evaluation.completed
evaluation.failed
```

Outgoing pattern:

```text
evaluation.job
```

The worker queue defaults to `ai-evaluation-worker`; the orchestrator queue defaults to `ai-orchestrator`.

## Run locally

```bash
npm install
cp .env.example .env
npm run build
npm test
npm run start:dev
```

HTTP endpoints use the `/api/ai-orchestrator` prefix:

```text
GET /health/live
GET /health/ready
GET /metrics
GET /admin/status
GET /admin/status/:evaluationId
```

RabbitMQ is required at `RABBITMQ_URL`. The existing Python evaluator remains a separate worker process and should consume the `evaluation.job` message and publish completion/failure events to the orchestrator queue.
