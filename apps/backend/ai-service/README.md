# DOMROV AI Evaluation Service

This service preserves the evaluator implementation copied from `apps/code_eval` under `ai/`, `utils/`, and the legacy integration modules. The new service boundary is under `app/`.

## Runtime modes

```bash
python -m app.main          # HTTP health/metrics + gRPC API
python -m app.main worker   # Redis/RQ worker
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

## Focused checks

```bash
python -m compileall app
python -m pytest tests
```
