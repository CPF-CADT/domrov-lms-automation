# Microservices Conventions

These conventions apply to the contracts added in WP-0 and to later service
implementations.

## Request context

Clients may send `X-Request-Id`. A service must preserve it when valid or create
one when absent, and return it in the response header. Internal calls should
also propagate `X-Request-Id` and `X-Trace-Id`.

## Error envelope

All HTTP errors use this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "details": [],
    "requestId": "req_123"
  }
}
```

`code` is a stable machine-readable value. `message` is safe for clients. Do
not include secrets, tokens, SQL, or stack traces in the response.

## Health and metrics

Every service exposes:

```text
GET /health/live   # process is running
GET /health/ready  # required dependencies are reachable
GET /metrics       # Prometheus text format
```

Readiness failures must remove a pod from traffic; they must not cause the
process to exit solely because a temporary dependency is unavailable.

## Authentication

The Auth Service signs JWTs. Other services validate the token locally using
the configured verification key and use `sub` as the external user ID. They do
not query `auth_db` for every request.

## Service failures

Internal clients must set explicit connect and request timeouts. Retries are
only allowed for idempotent operations or requests carrying an idempotency key.
Dependency failures return a stable error code and preserve pending state for
asynchronous workflows.

## Idempotency

Payment and credit mutation endpoints require:

```text
Idempotency-Key: <stable-operation-key>
```

The service stores the key and outcome in its own database and returns the
original outcome for a repeated request.
