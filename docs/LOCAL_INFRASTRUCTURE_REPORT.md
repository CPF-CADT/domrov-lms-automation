# DOMROV LMS — Local Infrastructure Verification and Integration Handover

| Item | Snapshot |
| --- | --- |
| Repository | `CPF-CADT/domrov-lms-automation` |
| Branch | `feat/local-infrastructure` |
| Inspected HEAD | `15cc6493e0d59096726ba5e031515a70dbaa4501` |
| Inspection date | 2026-11-16, approximately 10:00–10:04 ICT (UTC+07:00) |
| Phase 3 — Task 09 | Local Docker infrastructure operational; service integration defects remain open |
| Phase 3 — Task 10 | Planned; the six workflows below have **not** been executed by this review |
| Change scope | This report only; read-only configuration, source, HTTP, broker, log, and database metadata inspection |

## 1. Executive assessment and evidence limits

All 12 Compose services were running at inspection. The five backend services, five PostgreSQL containers, and RabbitMQ reported healthy. Nginx served the gateway health endpoint on `http://localhost:8088`. Database metadata confirmed initialized schemas, with the Payment schema defect described below. Broker metadata confirmed connected consumers and empty queues at that instant.

These milestones establish the local infrastructure baseline for Task 09. They do not establish successful business workflows, delivery guarantees, credit accounting, safe untrusted execution, or production readiness. Task 10 acceptance remains pending the owner actions and evidence in this report.

Evidence labels used here:

- **Observed:** commands executed during this review against the existing local stack.
- **Source:** configuration or code inspected at the HEAD above; deployed image equivalence was not established.
- **Prior verification:** a result supplied in the handover request, explicitly distinguished from a fresh probe.
- **Planned:** future acceptance work; commands are instructions for a later integration session.

No application source, migrations, Compose configuration, or broker definitions were changed. No migrations were executed, RabbitMQ messages published or fetched, payments initiated, containers restarted, volumes deleted, commits made, or pushes performed. HTTP error probes used GET requests. The login POST result below is prior verification and was not repeated.

## 2. Infrastructure and health checks

Primary evidence: [`docker-compose.yml`](../docker-compose.yml), service Dockerfiles, health handlers, and `docker compose ps --format json`.

| Compose service | Role / endpoint inside container | Observed state |
| --- | --- | --- |
| `gateway` | Nginx, host `8088` → container `80`; `/health` | Running; HTTP 200; no Docker health check configured |
| `user` | Auth/User, `3001`; `/health/ready` | Running, healthy |
| `academic-service` | Academic, `3002`; `/api/academic/health/ready` | Running, healthy |
| `payment-service` | Payment, `3003`; `/health/ready` | Running, healthy |
| `evaluation-service` | Evaluation, `3004`; `/health/ready` | Running, healthy |
| `code-execution` | Go Execution, `3005`; `/health/ready` | Running, healthy |
| `auth-db` | PostgreSQL 16, `auth_db` | Running, healthy |
| `academic-db` | PostgreSQL 16, `academic_db` | Running, healthy |
| `payment-db` | PostgreSQL 16, `payment_db` | Running, healthy |
| `evaluation-db` | PostgreSQL 16, `evaluation_db` | Running, healthy |
| `execution-db` | PostgreSQL 16, `execution_db` | Running, healthy |
| `rabbitmq` | RabbitMQ 3.13, AMQP `5672`, management `15672` | Running, healthy |

Application health checks use `wget` every 10 seconds with a 5-second timeout and 10 retries. PostgreSQL uses `pg_isready` every 5 seconds with a 5-second timeout and 10 retries. RabbitMQ uses `rabbitmq-diagnostics -q ping` every 10 seconds with a 5-second timeout and 12 retries. Gateway dependencies require applications to be started and RabbitMQ to be healthy; they do not require application readiness.

Health coverage has limits. Auth, Academic, and Payment check initialization and `SELECT 1`; their disconnected branch returns a body marked `not_ready` with HTTP 200. Evaluation checks `SELECT 1`. Go Execution's readiness handler returns a static connected response after startup; its database is pinged and its table created during startup, but the handler does not recheck dependencies. PostgreSQL readiness establishes server availability, not schema completeness. RabbitMQ ping establishes node availability, not business routing correctness. These checks explain how healthy containers can coexist with the defects below.

Persistence is configured for all five databases, RabbitMQ, and Academic files through named volumes. Execution mounts a host workspace and the host Docker socket. Host ports expose the five applications and broker in addition to the gateway; Compose does not restrict published ports to loopback. This is a local development configuration.

## 3. Database initialization

Observed using `information_schema.tables`, `information_schema.columns`, and SELECTs from existing TypeORM migration ledgers. Table counts below exclude the `migrations` table. No initializer or migration was run during this review.

| Service | Observed database state | Source configuration / startup behavior |
| --- | --- | --- |
| Auth/User | Five ledger entries; five domain tables: `users`, `user_refresh_token`, `user_email_otp`, `oauth_accounts`, `notifications` | `synchronize: false`; this checkout registers three migrations; Dockerfile starts the application without a migration command |
| Academic | Five migrations applied; eight domain tables: `classes`, `enrollments`, `teams`, `team_members`, `assignments`, `rubrics`, `resources`, `submissions` | `synchronize: false`; all five migrations registered; Dockerfile starts the application without running migrations |
| Payment | Two migrations applied; six domain tables: `wallet_balances`, `credit_packages`, `payments`, `credit_reservations`, `wallet_transactions`, `idempotency_records` | `synchronize: false`; only two migrations registered; Dockerfile runs the registered migration set before application startup |
| Evaluation | Two tables: `evaluations`, `user_ai_keys`; no migration ledger | `synchronize: true` creates/updates schema automatically; no migration files found |
| Code Execution | `execution_jobs` exists | Go `store.Open` pings the database and executes `CREATE TABLE IF NOT EXISTS`; no versioned migration framework identified |

### Applied migration names

| Database | Observed ledger entries in order |
| --- | --- |
| Auth | `InitialAuthSchema1763000000000`, `AddOAuthAccounts1763000001000`, `AddNotifications1763000002000`, `HashRefreshTokens1763000003000`, `HardenEmailOtps1763000004000` |
| Academic | `InitialAcademicSchema1764000000000`, `UseStringUserIds1764000002000`, `AddMissingAcademicColumns1764000003000`, `AddAssignmentWorkflowColumns1764000004000`, `AddRubricCriterion1764000005000` |
| Payment | `InitialPaymentSchema1764000000000`, `UseStringUserIds1764000002000` |

Auth's last two ledger entries have no matching migration files or registrations in this checkout. This is evidence of database/check-out history drift; its origin was not determined. Auth's owner must reconcile the applied history with the intended source/image revision before claiming a reproducible baseline. Do not delete ledger entries to hide the difference.

Payment's `credit_packages` has ten columns at inspection, and `description` is absent. The entity expects this column. `AddCreditPackageDescription1764000001000` exists in source but is omitted from the data source's explicit migration list; it is also absent from the applied ledger. Two applied migrations therefore do not imply a complete Payment schema.

Relevant source files:

- [Auth data source](../apps/backend/user/src/database/data-source.ts)
- [Academic data source](../apps/backend/academic/src/database/data-source.ts)
- [Payment data source](../apps/backend/payment/src/database/data-source.ts) and [description migration](../apps/backend/payment/src/database/migrations/1764000001000-AddCreditPackageDescription.ts)
- [Evaluation module](../apps/backend/evaluation/src/app.module.ts)
- [Execution store](../apps/backend/code-execution-go/internal/store/store.go)

## 4. Gateway verification

Evidence: [`infra/gateway/nginx.conf.template`](../infra/gateway/nginx.conf.template), `git show 15cc649`, and localhost HTTP probes.

| Method and gateway path | Status | Evidence / meaning |
| --- | --- | --- |
| `GET /health` | 200 | Observed; gateway responder available |
| `GET /api/academic/health/live` | 200 | Observed; request reached Academic liveness handler |
| `GET /api/users/me` | 401 | Observed; unauthenticated request rejected |
| `POST /api/auth/login`, empty body | 400 | Prior verification supplied in handover; validation rejection, not successful login |
| `GET /credit-packages` | 500 | Observed; Payment logs contain missing `description` column error |
| `GET /evaluations/not-a-uuid` | 500 | Observed; Evaluation logs contain invalid UUID error and SQLSTATE `22P02` |

Commit `15cc649` corrects prefixed Auth/User routing: `/api/auth/...` is rewritten to `/auth/...`, and `/api/users/...` to `/users/...`. Exact prefix roots redirect with HTTP 308 and preserve query arguments. This correction does not certify every gateway path.

GW-02 must cover the remaining route families, verbs, authentication, response envelopes, browser CORS, cookies, uploads, and WebSockets. Specific source findings to verify:

- `/api/academic` is passed through to Academic's matching global prefix. Legacy `/class`, `/team`, `/assessments`, `/submissions`, and `/file` paths are rewritten beneath that prefix.
- `/api/payment` and `/api/ai` are passed through without prefix stripping, while Payment and Evaluation's inspected bootstraps set no matching global HTTP prefix. Route compatibility needs an explicit contract and request matrix.
- `/executions/...` targets Academic; `/execution-runs/...` is rewritten to Go's `/executions/...`. Creation and result polling use different upstream services.
- Payment Socket.IO uses its default path, while Nginx has no `/socket.io/` location. Upgrade headers alone do not supply a route. Verify the browser handshake without initiating a payment.
- Unmatched `/admin/*` routes depend on a host legacy backend, which is outside these 12 containers. A healthy stack does not establish that fallback's availability.
- Client and admin API defaults still target port 3000; the integration environment must explicitly point them at the gateway and validate the path convention. CORS currently allows `http://localhost:5173`; verify any distinct admin origin.

## 5. RabbitMQ verification

Observed in vhost `/` using `rabbitmqctl list_connections`, `list_queues`, `list_exchanges`, and `list_bindings`:

- Six connections, all in `running` state.
- Six queues, each with one active consumer.
- Every queue had `messages_ready=0`, `messages_unacknowledged=0`, and total `messages=0`.
- Application exchanges `domrov.events` and `domrov.commands` are durable **topic** exchanges. RabbitMQ's standard exchanges also exist.

These are instantaneous observations. Empty queues and active consumers do not demonstrate successful delivery, idempotency, retries, or result propagation. Publisher clients may create more connections/queues once exercised.

### Observed application bindings

All destinations below are queues. Default exchange bindings are omitted from this application table; each of the six queues also had its implicit binding from the unnamed exchange using its own queue name.

| Exchange | Routing key | Destination queue | Consumers | Ready / unacknowledged |
| --- | --- | --- | --- | --- |
| `domrov.events` | `evaluation.requested` | `domrov.evaluation.events` | 1 | 0 / 0 |
| `domrov.events` | `evaluation.job` | `domrov.evaluation.events` | 1 | 0 / 0 |
| `domrov.events` | `evaluation.requested` | `domrov.evaluation.worker` | 1 | 0 / 0 |
| `domrov.events` | `evaluation.job` | `domrov.evaluation.worker` | 1 | 0 / 0 |
| `domrov.events` | `evaluation.completed` | `domrov.academic.evaluation.completed` | 1 | 0 / 0 |
| `domrov.events` | `evaluation.failed` | `domrov.academic.evaluation.completed` | 1 | 0 / 0 |
| `domrov.events` | `code.execution.requested` | `domrov.code.execution.worker` | 1 | 0 / 0 |
| `domrov.commands` | `credit.reserve` | `domrov.payment.commands` | 1 | 0 / 0 |
| `domrov.commands` | `credit.commit` | `domrov.payment.commands` | 1 | 0 / 0 |
| `domrov.commands` | `credit.release` | `domrov.payment.commands` | 1 | 0 / 0 |
| None from application exchanges | None | `auth-commands` | 1 | 0 / 0 |

No binding matching `code.execution.completed` was identified. No application binding to `auth-commands` was identified; having a consumer alone does not provide notification routing.

### Definitions and runtime differ

[`infra/rabbitmq/definitions.json`](../infra/rabbitmq/definitions.json) declares five queues, including `domrov.auth.notifications`, and one intended evaluation key per Evaluation queue. The observed broker instead has `auth-commands`, includes the Execution queue, binds both evaluation keys to both Evaluation queues, and has explicit credit keys rather than the file's `credit.*` binding. The service bootstraps/handlers establish additional topology dynamically. File contents do not prove which definitions were loaded into the persistent broker.

The existing [RabbitMQ platform document](rabbitmq-platform.md) describes retry/DLQ exchanges, a direct command exchange, and older queue names. Those descriptions are not evidence of the inspected runtime: only the two application topic exchanges were found, and no retry or DLQ queues were present. Owners should reconcile documentation, startup declarations, and intended topology without deleting the persistent broker volume.

## 6. Integration issue register

Priority convention: **P0** blocks the relevant integration workflow or risks lost/duplicated results or credit effects; **P1** must close before release and before acceptance of the affected behavior. These are proposed handover priorities, not production incident severities. All issues remain open; recommended fixes belong to later owner changes.

### PAY-DB-01 — Missing credit package description

- **Evidence / cause:** Observed missing `credit_packages.description`, HTTP 500 on `GET /credit-packages`, and matching error in Payment logs. The entity expects the column; migration `AddCreditPackageDescription1764000001000` exists but is not registered in `src/database/data-source.ts`.
- **Impact:** Credit package listing fails; blocks package/billing API acceptance. This alone does not prove reservation operations are broken.
- **Priority / owner:** P0 for package integration — **Payment teammate**.
- **Recommended action:** Register and package the existing migration, review its ordering against the already applied later migration, and deliver a controlled upgrade procedure with backup and recovery steps. No migration was run here.
- **Acceptance criteria:** Column exists with the intended nullable text definition; the migration ledger records the change; package listing returns HTTP 200; both a fresh database and an upgrade from the two-entry baseline pass; existing rows and balances remain intact.

### EVAL-DB-01 — Automatic schema synchronization without migrations

- **Evidence / cause:** `src/app.module.ts` sets TypeORM `synchronize: true`; no migration files found; runtime contains `evaluations` and `user_ai_keys` without a migration ledger.
- **Impact:** No reviewed, versioned schema upgrade/recovery path; a clean local start can conceal schema drift. Blocks reproducible deployment acceptance.
- **Priority / owner:** P1 — **Evaluation teammate**.
- **Recommended action:** Provide a baseline and upgrade strategy for both existing synchronized databases and fresh databases, then disable synchronization in the deployment configuration after the migration path is proven.
- **Acceptance criteria:** Versioned migrations create both tables; a populated baseline upgrades without data loss; normal startup performs no automatic schema changes; migration status and backup/restore evidence are attached.

### EVAL-API-01 — Malformed evaluation UUID returns HTTP 500

- **Evidence / cause:** Observed `GET /evaluations/not-a-uuid` → 500; logs contain SQLSTATE `22P02`. `http.controller.ts` forwards a raw path parameter to a lookup of the UUID primary column.
- **Impact:** Invalid client input reaches PostgreSQL and appears as a server failure; blocks negative API acceptance.
- **Priority / owner:** P1 — **Evaluation teammate**.
- **Recommended action:** Validate UUID syntax at the HTTP boundary and return a consistent client error before querying.
- **Acceptance criteria:** Malformed UUID returns HTTP 400 without a database UUID error; a well-formed unknown UUID returns 404; a known record returns the documented response.

### ACD-01 — Readiness did not require initialized tables

- **Evidence / cause:** Prior verification reported HTTP 200 before Academic tables existed. Source `src/health.ts` tests only initialization and `SELECT 1`, explicitly uses HTTP 200, and returns HTTP 200 even in its disconnected branch. Current tables now exist.
- **Impact:** Startup orchestration can accept traffic before the schema is usable; blocks reliable clean-start integration acceptance.
- **Priority / owner:** P1 — **Academic teammate**.
- **Recommended action:** Define a schema-aware readiness contract and migration prerequisite; return non-2xx while required dependencies/schema are unavailable. Keep liveness independent.
- **Acceptance criteria:** On a separately provisioned empty test database or unavailable dependency, readiness returns 503 until initialization succeeds; liveness remains valid; ready changes to 200 only after required schema checks pass. Do not remove tables from the current stack to test this.

### MQ-01 — Both Evaluation queues receive both evaluation keys

- **Evidence / cause:** Live bindings show `evaluation.requested` and `evaluation.job` on both `domrov.evaluation.events` and `domrov.evaluation.worker`. Both connected RMQ servers share the controller with both handlers.
- **Impact:** Each event can reach two queues and concurrent handlers. The find-then-save and terminal-status checks do not establish concurrency safety; duplicate work or credit effects are possible, but were not triggered in this review.
- **Priority / owner:** P0 — **Evaluation teammate**.
- **Recommended action:** Separate orchestration and worker subscriptions or deliberately select one shared queue model; enforce atomic claims/deduplication in addition to correcting bindings. Reconcile existing persisted bindings as well as startup behavior.
- **Acceptance criteria:** Broker binding output matches the approved topology; one logical request yields one job and one credit lifecycle; concurrent duplicate delivery and restart tests show no duplicate processing or credit effects.

### MQ-02 — Execution completion has no identified recipient

- **Evidence / cause:** Go `internal/messaging/rabbitmq.go` publishes `code.execution.completed`. No matching live binding or Academic completion handler was identified. Academic's messaging controller handles evaluation results only.
- **Impact:** Completion can be unroutable and Academic has no demonstrated asynchronous execution-result update. A separate direct Go polling endpoint does not prove this event flow.
- **Priority / owner:** P0 for completion integration — **Academic and Execution teammates**.
- **Recommended action:** Agree the consumer owner, queue, payload/envelope, result persistence, correlation, and idempotency contract; implement the agreed completion path and detect unroutable publication.
- **Acceptance criteria:** Matching binding and active consumer exist; one execution ID can be traced from Academic request through Go persistence to the agreed result view; redelivery is harmless; both successful and failed results propagate.

### MQ-03 — Execution ACK follows unchecked persistence/publication

- **Evidence / cause:** Go consumer discards errors from `db.SaveResult` and `b.Publish` before `delivery.Ack`. Publication has no broker-confirm handling in the inspected implementation.
- **Impact:** A job can be acknowledged with a missing durable result or completion event; blocks reliable result-delivery acceptance.
- **Priority / owner:** P0 — **Execution teammate**.
- **Recommended action:** Handle persistence and publication failures explicitly; define retry/recovery and idempotency behavior, with durable result/event coordination and delivery confirmation appropriate to the chosen design.
- **Acceptance criteria:** Isolated tests of database and broker failure show no premature success ACK or lost completion; restart/redelivery recovers without rerunning effects incorrectly; failure evidence and bounded retry/recovery behavior are documented.

### EXEC-01 — Host Docker socket access requires isolation review

- **Evidence / cause:** Compose mounts `/var/run/docker.sock` into the Execution service; its runtime image uses the Docker CLI and runs as root.
- **Impact:** Execution service access to the host daemon is a host isolation concern. Existing child-container controls alone do not demonstrate safe acceptance of untrusted workloads.
- **Priority / owner:** P0 before untrusted workloads — **DevOps and Execution teammate**.
- **Recommended action:** Review the execution trust boundary and adopt a dedicated isolated worker/daemon or equivalent approved boundary; review mount, network, user, capability, resource, and cleanup controls.
- **Acceptance criteria:** Documented isolation decision and deployment topology; security review evidence for host access, mounts, networking, limits, timeouts, and cleanup; only repository-controlled benign fixtures used until accepted.

### GW-02 — Remaining frontend/gateway route compatibility unverified

- **Evidence / cause:** Only the targeted Auth/User prefix fix and limited probes are verified. Remaining pass-through prefixes, Socket.IO path, frontend API defaults, and external legacy fallback are described in section 4.
- **Impact:** Healthy services may still be unreachable or return incompatible paths/envelopes through the frontend. Blocks full gateway/frontend acceptance.
- **Priority / owner:** P0 for full gateway acceptance — **DevOps**, with service owners confirming their contracts.
- **Recommended action:** Inventory actual client/admin calls and compare method, path, upstream, rewrite, authorization, response shape, and browser behavior. Resolve mismatches in a separate implementation change.
- **Acceptance criteria:** Reviewed matrix covers all service families and required frontend/admin calls; expected 2xx/4xx responses and schemas match; no routing-related 404/502; browser login/refresh, preflight, upload, and authenticated WebSocket handshake pass; legacy-dependent routes have an explicit availability or removal decision.

## 7. Additional contract gates discovered during review

These findings extend the requested issue register. They are not claims that an end-to-end failure has already been reproduced.

| Gate | Evidence and impact | Owner / proposed priority | Required acceptance evidence |
| --- | --- | --- | --- |
| User identity compatibility | Runtime `users.id` is `integer`, while Evaluation's `evaluations.userId` is `uuid`. Auth source also uses a numeric generated ID. A normal numeric Auth subject cannot be persisted directly in that UUID column. | Evaluation + Auth + Academic / P0 before Evaluation workflows | Agreed identity representation, compatible schema/transport, and an actual Auth-issued subject accepted across Academic, Evaluation, and Payment without conversion errors |
| Evaluation input and runner contract | Academic publishes `resourceId` and optional `language`; Evaluation expects `resourceKey` and required `language`. Its configured runner is `MockRunnerService`, which supports JS/TS aliases and returns a canned score. | Academic + Evaluation / P0 for input contract; P1 for real evaluation acceptance | Agreed payload and resource access model; missing/unsupported language handling; explicit labeling of mock-only tests; separate evidence before claiming real resource evaluation |
| Payment mode and credit protocol | Compose defaults `EVALUATION_PAYMENT_MODE` to `disabled`. Evaluation sends `credit.reserve` but emits commit/release as events, while Payment declares all three as `@MessagePattern` request handlers. Evaluation generates idempotency keys from a random ID when payload has no `evaluationId`, including the reserve payload. | Evaluation + Payment / P0 before credit workflow | Agreed request/event semantics; confirmed reservation response; stable evaluation-based idempotency across reserve/commit/release; timeout recovery; exactly one reservation and terminal credit transition on duplicate/retry tests |
| Auth migration history | Two applied Auth migration names are absent from the checkout. Running dev-tag images were not proven to match HEAD. | Auth + DevOps / P1 before reproducibility/release sign-off | Source/image revision mapping and complete migration history; owner-approved fresh/upgrade procedure preserving existing data |
| Broker topology/recovery baseline | Definitions, running topology, and older platform documentation disagree; no retry/DLQ queues or notification binding were observed. | DevOps + consumer owners / P1; required before affected workflow acceptance | Approved topology and reconciliation procedure, explicit failure recovery strategy, and notification routing evidence if notifications are in Task 10 scope |

## 8. Team handover and acceptance responsibilities

| Owner | Work to take over | Expected evidence in owner PR / handover |
| --- | --- | --- |
| Auth/User teammate | Reconcile migration drift; supply approved teacher/student test accounts and token/subject contract | Source/image revision and migration inventory; sanitized login/profile results; subject type and role claims; no credentials or tokens attached |
| Academic teammate | ACD-01; joint MQ-02; align Evaluation payload; own class/submission/result contracts | Empty-schema readiness evidence from isolated environment; authenticated class creation; request/result IDs, sanitized submission state transitions, completion consumer evidence |
| Payment teammate | PAY-DB-01; joint credit protocol/idempotency contract | Fresh/upgrade schema results and ledger; HTTP 200 package list; isolated fixture credit accounting before/after, duplicate and insufficient-credit cases; no external payment transaction |
| Evaluation teammate | EVAL-DB-01, EVAL-API-01, MQ-01; identity/input/credit contracts | Migration strategy; 400/404 API checks; corrected live bindings; single-processing/concurrency evidence; evaluation/result correlation and credit lifecycle evidence |
| Execution teammate | MQ-03; joint MQ-02 and EXEC-01 | Persistence/publication failure tests; completion routing; benign execution outputs; duplicate/restart recovery; isolation controls and cleanup evidence |
| DevOps | GW-02; joint EXEC-01; coordinate Task 10 and reproducibility/topology reconciliation | Route matrix and gateway/browser evidence; container/image inventory; broker snapshot; isolation decision; owner acknowledgments and workflow acceptance checklist |

### Gates for integration testing

Read-only smoke checks can continue. Full Task 10 acceptance is blocked by the user-ID/input contracts for Evaluation, MQ-01 duplicate-delivery risk, MQ-02 missing completion recipient, MQ-03 result-loss risk, and the credit protocol/idempotency contract with Payment mode disabled. PAY-DB-01 blocks package APIs; GW-02 blocks acceptance through all frontend routes. ACD-01 blocks trustworthy clean-start sequencing. EXEC-01 blocks untrusted workloads; benign controlled fixtures can be planned in an isolated environment. No single defect should prevent unrelated read-only inspection.

### Gates for production deployment

All correctness/delivery defects above require closure for their affected production paths. EVAL-DB-01, Auth schema history drift, readiness limitations, unproven Execution schema upgrade handling, and EXEC-01 require explicit deployment decisions and evidence. Retry/recovery behavior and topology must be proven. Local defaults, published application/broker ports, plain HTTP gateway, dev image tags, and external legacy fallback need a deployment-specific configuration and review. Secret handling, network boundaries, backups/restoration, immutable image provenance, and operational monitoring are not accepted by this local report. Production readiness is not claimed.

### Recommended resolution order

1. Agree Auth identity, Evaluation payload, credit protocol/idempotency, execution completion ownership, and a source/image baseline. These are shared contracts for later fixes.
2. Payment fixes PAY-DB-01; Evaluation delivers its migration plan and UUID validation; Academic fixes readiness. Validate fresh and existing database paths in a separate environment.
3. Evaluation resolves MQ-01; Execution resolves MQ-03; Academic/Execution resolve MQ-02. DevOps reconciles actual/persisted broker topology with the approved contract.
4. DevOps and Execution close the isolation review before expanding beyond controlled benign fixtures. DevOps completes GW-02 with service owners in parallel with service fixes.
5. Run Task 10 workflows in the order below, retaining sanitized evidence. Run the credit-enabled variant only after the Payment/Evaluation owners accept the protocol and fixtures. Close Task 10 only after every required workflow and failure case passes.

## 9. Task 10 — Planned end-to-end integration

**Status: not executed.** The following commands are future verification steps. Mutating HTTP requests will indirectly publish application messages or change test data; they must not be run as part of this documentation-only review. No direct RabbitMQ publishing commands are included. Credit reservation testing means isolated internal fixture credits, not a purchase, QR payment, provider verification, or external funds transfer.

### Preconditions and evidence capture

- Use a separate integration Compose project/ports/workspaces with separate database and RabbitMQ volumes; do not reuse production data. Confirm the rendered resource names and mounts before starting it. Provision accounts/resources through owner-approved fixture procedures outside this review.
- Reconcile source/image/schema versions and establish the required schema using reviewed owner procedures. The current local stack's running state does not prove clean initialization.
- Resolve the contract and per-workflow gates above. Keep payment mode disabled for the initial non-credit evaluation flow and explicitly label that evidence. Provision credit-enabled fixtures separately for workflow 4.
- Set `GATEWAY=http://localhost:8088` for the intended test stack, or its isolated port. Obtain a teacher and student access token through the approved Auth login process. Keep credentials, token values, cookies, provider data, and API keys out of PRs and logs. Commands below use environment placeholders only; do not use shell tracing or verbose HTTP logging.
- Prepare `CLASS_ID`, `ASSIGNMENT_ID`, `SUBMISSION_ID`, `RESOURCE_ID`, and later `EXECUTION_ID`/`EVALUATION_ID` from actual responses; never guess them. Confirm fixture ownership/enrollment. Record each test's image revision, timestamp, method/path, status, sanitized response, logical IDs, database state, and relevant broker counters.
- Use bounded polling (for example, every 2 seconds for at most 60 seconds) and fail with retained evidence on timeout; do not retry mutating requests blindly.

### Read-only baseline commands

Run from the repository root against the selected stack. These reproduce the metadata checks used in this review. If using a separate project/file, apply that selection consistently to every Compose command.

```bash
docker compose ps --format json
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/health"
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/api/academic/health/live"
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/api/users/me"
docker compose exec -T rabbitmq rabbitmqctl list_connections state
docker compose exec -T rabbitmq rabbitmqctl list_queues -p / name consumers messages_ready messages_unacknowledged messages
docker compose exec -T rabbitmq rabbitmqctl list_exchanges -p / name type durable
docker compose exec -T rabbitmq rabbitmqctl list_bindings -p / source_name destination_name destination_kind routing_key
```

Expected baseline: all services running, configured checks healthy; statuses 200, 200, 401 respectively; consumers/bindings match the approved topology. Connection/queue counts can change when publisher clients become active; compare their identities and purpose, not just the original count of six.

```bash
for svc in auth academic payment; do
  docker compose exec -T "$svc-db" psql -X -U domrov -d "${svc}_db" \
    -v ON_ERROR_STOP=1 -c 'SELECT id, timestamp, name FROM migrations ORDER BY id;'
done
docker compose exec -T payment-db psql -X -U domrov -d payment_db \
  -v ON_ERROR_STOP=1 -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_packages' ORDER BY ordinal_position;"
docker compose exec -T evaluation-db psql -X -U domrov -d evaluation_db \
  -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"
docker compose exec -T execution-db psql -X -U domrov -d execution_db \
  -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public.execution_jobs');"
```

Expected after owner fixes: complete registered/applied migration history, Payment description column present, Evaluation schema matching its accepted migration baseline, Execution table present. Do not use the current defective two-entry Payment ledger as the future acceptance target.

### Workflow 1 — Auth → Academic: authenticated class creation

**Owners:** Auth + Academic; DevOps verifies gateway. **Gates:** approved Auth account/subject and Academic schema/readiness.

Use the existing login request contract (`email`, `password`) via `/api/auth/login` to obtain the teacher token in memory. The inspected response wraps it under `data.accessToken`; never attach the raw response. Then:

```bash
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $TEACHER_ACCESS_TOKEN" "$GATEWAY/api/users/me"
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -X POST "$GATEWAY/api/academic/classes" \
  -H "Authorization: Bearer $TEACHER_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data '{"name":"Task 10 integration fixture","description":"Disposable local acceptance fixture"}'
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -H "Authorization: Bearer $TEACHER_ACCESS_TOKEN" "$GATEWAY/api/academic/classes"
```

**Expected:** profile 200; class creation 201 under the current controller contract; returned class ID appears in the authenticated list and is owned by the Auth subject. Repeat the class request without/with an expired token only in the future test session: expect 401 and no class created. Verify another user's access follows the agreed authorization contract.

**Rollback:** retain the generated class ID; use owner-approved fixture cleanup or restore the isolated baseline after all dependent fixtures are done. Do not delete shared database rows or volumes.

### Workflow 2 — Academic → RabbitMQ → Code Execution

**Owners:** Academic + Execution. **Gates:** MQ-02, MQ-03, and isolated benign execution setup under EXEC-01. Requires an accessible fixture submission.

```bash
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -X POST "$GATEWAY/api/academic/executions" \
  -H "Authorization: Bearer $TEACHER_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"submissionId\":\"$SUBMISSION_ID\",\"language\":\"javascript\",\"command\":\"node main.js\",\"files\":[{\"path\":\"main.js\",\"content\":\"console.log(42)\"}]}"
# Set EXECUTION_ID from the response, then poll within the agreed deadline.
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -H "Authorization: Bearer $TEACHER_ACCESS_TOKEN" "$GATEWAY/execution-runs/$EXECUTION_ID"
docker compose exec -T rabbitmq rabbitmqctl list_queues -p / name consumers messages_ready messages_unacknowledged
```

**Expected:** inspected Academic creation handler returns 201 with `executionId` and `QUEUED`; the worker consumes `code.execution.requested`; Go persists a terminal result with stdout containing `42`. Polling returns 200 for the owner. The future MQ-02 completion consumer must also expose the agreed Academic result update for the same ID; its endpoint must be added to the acceptance matrix by the owners. A Go result alone is insufficient for completion-event acceptance. Capture the row state through a SELECT filtered by the generated ID, without dumping request payloads. Check failure, duplicate-delivery, and restart cases in the isolated owner harness.

**Rollback:** stop issuing fixture jobs; let in-flight jobs settle or use the documented authorized cancellation path; retain results on failure. Clean only the fixture's workspace through the owner procedure; never remove the Docker socket or unrelated host/container resources as test cleanup.

### Workflow 3 — Academic → RabbitMQ → Evaluation

**Owners:** Academic + Evaluation. **Gates:** MQ-01 and identity/input contracts; approved Evaluation schema. Start with payment mode disabled, explicitly recording that setting.

Create an AI-enabled assignment, enroll the student, and attach a benign owner-provisioned resource. Set its language to `javascript` for the current mock runner. Submit through the application:

```bash
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -X POST "$GATEWAY/api/academic/assignments/$ASSIGNMENT_ID/submissions" \
  -H "Authorization: Bearer $STUDENT_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"resourceId\":\"$RESOURCE_ID\",\"language\":\"javascript\"}"
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' \
  -H "Authorization: Bearer $STUDENT_ACCESS_TOKEN" "$GATEWAY/api/academic/submissions/$SUBMISSION_ID"
# Obtain EVALUATION_ID from the submission view, then poll within the deadline.
curl --max-time 10 -sS -w '\nHTTP %{http_code}\n' "$GATEWAY/evaluations/$EVALUATION_ID"
docker compose exec -T rabbitmq rabbitmqctl list_bindings -p / source_name destination_name destination_kind routing_key
```

**Expected:** submission returns 201 and an asynchronous queued/pending state, not a synchronous grading claim. `evaluation.requested` creates one Evaluation record; `evaluation.job` causes one processing attempt; the same evaluation ID reaches a terminal state. Under the inspected mock runner, the benign JS fixture is expected to score 100; that is transport/orchestration evidence only. Verify counters/records, not queue emptiness alone. Missing/unsupported language and duplicate requests must have agreed outcomes without infinite requeueing or duplicate credit work.

**Rollback:** stop new submissions, retain failed messages/records for diagnosis, and clean fixtures only after all consumers settle. Do not purge queues or overwrite terminal submissions to replay a test; use new fixture IDs.

### Workflow 4 — Evaluation → Payment credit reservation

**Owners:** Evaluation + Payment. **Gates:** credit protocol/idempotency contract, MQ-01, compatible user IDs, schema baseline, and funded internal fixture wallet. PAY-DB-01 must also close for package API acceptance.

This variant requires a separate, explicitly configured credit-enabled Evaluation instance and preprovisioned synthetic credits. Record the chosen non-disabled mode and cost. Do not enable it on the shared stack as part of this report. Do not create or verify a payment to obtain credits.

Before and after a fresh workflow 3 submission, inspect only fixture accounting metadata:

```bash
docker compose exec -T payment-db psql -X -U domrov -d payment_db \
  -v ON_ERROR_STOP=1 -v fixture_user_id="$FIXTURE_USER_ID" <<'SQL'
SELECT user_id, "availableCredits", "reservedCredits"
FROM wallet_balances WHERE user_id = :'fixture_user_id';
SQL
docker compose exec -T payment-db psql -X -U domrov -d payment_db \
  -v ON_ERROR_STOP=1 -v evaluation_id="$EVALUATION_ID" <<'SQL'
SELECT id, reference_id, amount, status, idempotency_key
FROM credit_reservations WHERE reference_id = :'evaluation_id';
SQL
docker compose exec -T rabbitmq rabbitmqctl list_queues -p / name consumers messages_ready messages_unacknowledged
```

**Expected:** `credit.reserve` receives a response with the reservation ID within the defined timeout (currently 5 seconds); one reservation is associated with the evaluation; success commits it once and failure releases it once. Available/reserved credits reconcile before and after, with no external funds movement. Owners must test insufficient credits, request timeout, duplicate delivery, and commit/release retry in an isolated harness using the agreed stable idempotency key. Merely seeing `credit.*` bindings is insufficient evidence that the request/event protocol works.

**Rollback:** reconcile outstanding reservations through Payment's approved compensation procedure; keep the accounting audit trail. Do not edit balances directly, reverse shared transactions, or reset the database as cleanup. Restore the isolated test configuration after capturing evidence.

### Workflow 5 — Evaluation → RabbitMQ → Academic result update

**Owners:** Evaluation + Academic. **Gates:** successful workflow 3/4 setup and approved result/idempotency contracts.

For the same generated evaluation/submission IDs, use the workflow 3 GET commands to poll both service views and the read-only queue commands to inspect the Academic consumer. Have each owner supply SELECT-only evidence filtered by those IDs from `evaluations` and `submissions`.

**Expected:** `evaluation.completed` reaches `domrov.academic.evaluation.completed`; Academic persists the matching evaluation ID, terminal status, score, and feedback, and acknowledges after its save. A controlled runner failure must follow `evaluation.failed` and persist the agreed failed state. Duplicate results must preserve the accepted terminal result, and a result for an unknown submission must follow an explicitly accepted policy. Retain sanitized correlated producer/consumer evidence; current Evaluation envelopes generate a new correlation ID per event, so owners must agree trace continuity rather than assume it exists.

**Rollback:** preserve terminal records and event evidence. Do not manually overwrite grades to force a rerun; create a new fixture and use the owner recovery path if an event is lost.

### Workflow 6 — Gateway → all service routes

**Owner:** DevOps with all service owners. **Gates:** GW-02 and upstream contracts. Build the full matrix from actual client/admin calls, extending this minimum set:

| Service / family | Planned request | Expected outcome after fixes |
| --- | --- | --- |
| Gateway | `GET /health` | 200 |
| Auth/User | `GET /api/users/me`; login/refresh using valid test account | 401 without token; 200 with valid token; correct refresh cookie behavior |
| Academic | `GET /api/academic/health/live`; authenticated class workflow; `/class` aliases | 200 liveness and documented authorized responses/envelopes |
| Payment | `GET /credit-packages`; approved `/api/payment/...` counterparts | 200 package list after PAY-DB-01; prefixes match agreed contract |
| Evaluation | `GET /evaluations/<known-id>`; approved `/api/ai/...` counterparts | 200 known record, 404 valid unknown ID, 400 malformed ID |
| Execution | Authenticated `GET /execution-runs/<known-id>`; Academic `/executions` creation | 200 owner result; creation reaches Academic and yields queued ID |
| Notifications/admin | Actual client paths under `/notifications`, `/admin/users`, `/admin/wallet`, `/admin/dashboard`, `/admin/evaluations`, `/admin/usage`, `/admin/logs` | Authorization and documented response shapes; legacy fallback dependency explicitly identified |
| Browser transport | CORS preflight, upload/download, login cookie/refresh, authenticated Payment Socket.IO connection | Correct origin/credentials, payload limits, and WebSocket 101 handshake on the agreed path; no payment initiated |

Example future read-only route probes:

```bash
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/credit-packages"
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/evaluations/not-a-uuid"
curl --max-time 10 -sS -o /dev/null -w '%{http_code}\n' "$GATEWAY/evaluations/00000000-0000-0000-0000-000000000000"
curl --max-time 10 -sS -D - -o /dev/null -X OPTIONS "$GATEWAY/api/academic/classes" \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

Expect 200, 400, and 404 respectively for the first three requests, provided the well-formed unknown ID is absent. Preflight should return 204 with the required allow-origin, credentials, method, and header values. Browser tests must separately verify actual cookie and WebSocket behavior. Check a benign unknown gateway path returns the documented gateway 404. Attach a matrix showing upstream selection, not just HTTP status; a legitimate service 404 differs from a routing defect.

**Rollback:** retain the last known gateway configuration/image and rendered configuration for the chosen environment. Validate any later Nginx change before an owner-controlled reload; revert only that change if route checks regress. Preserve databases, broker topology, and persistent volumes.

### Common rollback and completion rules

Before later owner migrations/configuration changes, capture image versions, schema ledgers, intended broker topology, and restorable backups of the isolated baseline. Do not publish backup contents or exported secrets in the PR. Application rollback must remain compatible with the migrated schema; do not blindly run migration reversals. Avoid queue purges, volume deletion, destructive resets, or broker reinitialization to obtain a clean test result. Preserve failed artifacts and use fixture-specific cleanup/compensation after diagnosis.

Task 10 is accepted only when all six workflows have owner-reviewed evidence, negative/failure cases pass, outstanding credit reservations are reconciled, required route coverage is complete, and no P0 remains for the accepted scope. Infrastructure health alone cannot close it.

## 10. Documentation delivery checks

The initial worktree was clean. Final `git status --short` shows only `?? docs/LOCAL_INFRASTRUCTURE_REPORT.md`; no tracked files were modified. `git diff --check` produced no errors. The untracked report was also checked explicitly against `/dev/null` for whitespace errors because ordinary `git diff` does not cover it. Documented Bash blocks passed syntax-only validation; none of the planned workflow commands were executed. No commit or push is part of this handover.

**Recommended next action:** have each microservice owner acknowledge the issue register and shared contract gates, starting with identity/input/credit contracts and the Payment migration registration, then schedule the isolated Task 10 session after its workflow prerequisites close.
