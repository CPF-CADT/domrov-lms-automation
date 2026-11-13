# Microservices Boundary Map

This document records the WP-0 baseline for the backend refactor. The current
runtime remains `apps/backend_nest` plus `apps/code_eval`; the target services
are extracted incrementally without sharing repositories, entities, or database
connections.

## Current-to-target mapping

| Current location | Target service | Ownership after extraction |
| --- | --- | --- |
| `src/modules/auth` | User Service | Registration, login, refresh/logout, password reset, OAuth |
| `src/modules/user` | User Service | User profile and identity data |
| `src/libs/entities/user` | User Service | `users`, OAuth accounts, refresh tokens, email OTPs |
| `src/modules/class` | Academic Service | Classes, enrollment, invitations |
| `src/modules/team` | Academic Service | Teams and team membership |
| `src/modules/assessment` | Academic Service | Assignments, rubrics, submissions, academic feedback |
| `src/modules/file` | Academic Service initially | Submission/resource metadata and access policy; storage adapter may be split later |
| `src/libs/entities/classroom` | Academic Service | Class, enrollment, team entities |
| `src/libs/entities/assessment` | Academic Service | Assessment, rubric, submission, evaluation-result projection |
| `src/libs/entities/resource` | Academic Service | Resource and submission-resource metadata |
| `src/modules/wallet` | Payment Service | Wallet, payments, packages, transactions |
| `src/modules/user-ai` | Payment Service initially | User AI usage and provider-key billing ownership; provider-key encryption remains isolated |
| `src/libs/entities/ai/credit-package.entity.ts` | Payment Service | Credit packages |
| `src/libs/entities/ai/payment.entity.ts` | Payment Service | Payment records |
| `src/libs/entities/ai/user-credit-balance.entity.ts` | Payment Service | Wallet balances |
| `src/libs/entities/ai/wallet-transaction.entity.ts` | Payment Service | Wallet ledger |
| `src/libs/entities/ai/ai-usage-log.entity.ts` | Payment Service | Billable AI usage ledger |
| `src/modules/evaluation` | AI Service client boundary | Requests/status integration only; no AI database access |
| `apps/code_eval` | AI Service | Evaluation API, workers, LLM orchestration, evaluation results |
| `src/modules/tasks` | Service-local workers | Keep only jobs owned by the service; move evaluation jobs to AI workers |
| `src/services/redis.service.ts` | Platform/service adapter | Redis connection is configured per service; it is not a shared database |

## Database ownership

The current `src/database/data-source.ts` is shared by the monolith. During
extraction, each target service receives its own connection and migrations:

```text
User Service      -> auth_db
Academic Service  -> academic_db
Payment Service   -> payment_db
AI Service        -> ai_db plus Redis for queue state
```

An external `userId` may be stored in another service as an identifier, but it
must not be a cross-database foreign key. No service may import another
service's TypeORM entities or repositories.

## Existing route baseline

The current public route groups are mapped as follows:

| Current route group | Target owner |
| --- | --- |
| `/auth/*`, `/users/*` | User Service |
| `/class/*`, `/team/*`, `/assessments/*`, `/submissions/*`, `/file/*` | Academic Service |
| `/wallet/*`, `/payment/*`, `/admin/wallet/*` | Payment Service |
| `/evaluations/*`, internal evaluation gRPC | AI Service; result projection remains Academic Service |
| `/user-ai/*` | Payment Service initially, pending a later provider-configuration decision |

The route paths are preserved behind an API Gateway/Ingress during migration so
the frontend does not need an all-at-once rewrite.

## Known baseline constraints

- The current NestJS app uses one PostgreSQL connection and is not yet split.
- The current NestJS-to-Python evaluation call is gRPC and the Python service
  already uses Redis/RQ-style asynchronous processing.
- The existing gRPC implementation returns a legacy success/message response;
  `contracts/ai/evaluation.proto` defines the target evaluation-ID contract.
- The current Compose file starts one `backend` container and one `code_eval`
  container. WP-5 will replace this with independent service containers and
  databases after the contracts are accepted.

## Migration guardrails

1. Extract one bounded context at a time.
2. Keep the old route working until the replacement has an integration test.
3. Migrate data with additive, reversible migrations; do not drop shared tables
   during extraction.
4. Delete old imports only after cross-service contract and runtime checks pass.
