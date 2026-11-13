# DOMROV Microservices Refactoring Execution Plan

## Mission

Refactor only the backend into four independently deployable microservices according to the Production Microservices Refactoring PRD in `README.md`.

## Source of truth

- Read the Production Microservices Refactoring PRD in `README.md` before changing code.
- Preserve existing product behavior unless a task explicitly changes it.
- Do not share entities, repositories, migrations, or database connections between services.
- Do not modify the frontend unless an integration change is required and documented.

## Target services

| Service | Runtime | Database | Primary responsibility |
|---|---|---|---|
| `auth-service` | NestJS/Node.js | `auth_db` | Identity, JWT, users, roles, OAuth |
| `academic-service` | NestJS/Node.js | `academic_db` | Classes, teams, assignments, submissions |
| `payment-service` | NestJS/Node.js | `payment_db` | Wallet, credits, payments, transactions |
| `ai-service` | Python | `ai_db` + Redis | Code evaluation, AI feedback, workers |

## Non-negotiable rules

1. Each service must build and test independently.
2. Each service must have its own Dockerfile and environment template.
3. Each service must own its database and migrations.
4. No service may query another service's database.
5. External clients use REST through the gateway/Ingress.
6. AI evaluation must be asynchronous and return an evaluation ID.
7. Payment operations must be idempotent.
8. Secrets must not be committed or logged.
9. Preserve existing behavior and avoid destructive database operations.
10. Do not mark a task complete without running its focused checks.

## Work packages

### WP-0: Baseline and contracts

- Inspect current NestJS and Python modules, routes, entities, environment variables, and tests.
- Record the current-to-target module mapping.
- Define `contracts/auth/openapi.yaml`, `contracts/academic/openapi.yaml`, `contracts/payment/openapi.yaml`, and `contracts/ai/evaluation.proto`.
- Add request ID, structured logging, and common error response conventions.
- Add service health and metrics endpoint contracts.

Acceptance:

- Existing tests still run.
- Contracts identify ownership and request/response shapes.
- No implementation task depends on an undocumented route.

### WP-1: User Service

- Create `apps/backend/user`.
- Move authentication and user functionality from the old NestJS backend.
- Create `auth_db` migrations.
- Implement JWT access and refresh token flow.
- Implement health, readiness, metrics, structured logs, Dockerfile, and tests.
- Ensure other services validate tokens without importing Auth repositories or entities.

Acceptance:

- Register, login, refresh, logout, and `/users/me` work independently.
- User Service connects only to `auth_db`.
- Auth unit and integration tests pass.

### WP-2: Academic Service

- Create `apps/backend/academic`.
- Move classes, teams, assignments, rubrics, resources, and submissions.
- Create `academic_db` migrations.
- Replace direct user-database access with JWT claims or an Auth API client.
- Add asynchronous evaluation request handling.
- Implement health, readiness, metrics, structured logs, Dockerfile, and tests.

Acceptance:

- Class, assignment, and submission flows work independently.
- A submission is stored before evaluation is requested.
- Academic Service connects only to `academic_db`.
- Academic tests pass without the old monolith.

### WP-3: Payment Service

- Create `apps/backend/payment`.
- Move wallet, credit package, payment, and transaction functionality.
- Create `payment_db` migrations.
- Implement credit reservation, commit, release, refund, and idempotency.
- Implement health, readiness, metrics, structured logs, Dockerfile, and tests.

Acceptance:

- Payment and wallet flows work independently.
- Credit operations cannot double-charge on retries.
- Payment Service connects only to `payment_db`.
- Payment tests pass without the old monolith.

### WP-4: Evaluation Service

- Create `apps/backend/evaluation`.
- Create `evaluation_db` migrations and persistent evaluation records.
- Use RabbitMQ for asynchronous jobs, retries, and result events.
- Add Payment Service credit reservation integration.
- Implement health, readiness, metrics, structured logs, Dockerfile, and tests.

Acceptance:

- Evaluation requests return an evaluation ID without waiting for completion.
- Workers process queued jobs and persist results.
- Failed jobs are classified and retryable.
- Evaluation Service connects only to `evaluation_db` and RabbitMQ.
- AI tests and gRPC contract tests pass.

### WP-5: Local platform

- Replace the current backend Compose definition with independent service containers.
- Add `auth_db`, `academic_db`, `payment_db`, `ai_db`, and Redis.
- Add local health checks and dependency startup conditions.
- Keep the existing frontend usable through the gateway or documented service URLs.

Acceptance:

- `docker compose up --build` starts the local backend.
- Each service has an independent container and database.
- The end-to-end submission/evaluation flow works locally.

### WP-6: CI/CD
- Add request IDs and trace IDs across the evaluation flow.
- Add independent GitHub Actions workflows for each service.
- Build, test, scan, publish, deploy, smoke-test, and roll back by Git SHA.

Acceptance:

- Logs from all services are searchable in one place.
- Request rate, latency, errors, CPU, memory, queue depth, and evaluation status are visible.
- A failed AI request can be traced from Academic Service to AI Service and Redis worker.
- A changed service can be built and deployed without rebuilding unrelated services.

### WP-8: Integration and migration completion

- Run the complete end-to-end flow.
- Verify frontend routes and environment variables.
- Remove old monolith service dependencies after migration is proven.
- Verify no cross-service imports or database access remain.
- Update architecture, deployment, API, and incident documentation.

Acceptance:

- Login, class creation, assignment submission, payment, evaluation, and result delivery work.
- Old backend code is no longer required at runtime.
- All required checks pass or are documented as environment-blocked.

## Verification commands

Run the relevant commands inside each service directory:

```bash
npm ci
npm run lint
npm test -- --runInBand
npm run build
```

For the Python AI Service:

```bash
python -m pytest
python -m compileall app
```

Platform checks:

```bash
docker compose config
docker compose up --build
```

## Definition of done

- All work packages have met their acceptance criteria.
- Focused tests pass for every changed service.
- Docker Compose validates and starts the local environment.
- No shared database access remains.
- The integration flow is demonstrated.
- README architecture and this task file match the implementation.
- The final report includes changed files, checks, exit codes, blockers, and remaining work.
