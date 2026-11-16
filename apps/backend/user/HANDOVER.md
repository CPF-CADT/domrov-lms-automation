# User/Auth service handover

Repository: `CPF-CADT/domrov-lms-automation`

Branch: `fix/user-service-hardening`

Scope: `apps/backend/user`, the Auth REST contract, and integration documentation.

The service is independently buildable and its local checks pass. Final integrated
acceptance remains pending the owner actions below. This is not a production
rollout approval. No migration, data deletion, deployment, commit, or push was
performed. No additional security hardening or OWASP audit was undertaken.

## Preserved work and completed refactoring

The incoming worktree already contained refresh-token hashing/rotation, OTP HMAC
storage with persisted cooldown/attempts, two cutover migrations, SMTP handling,
Node 22/non-root Docker changes, and the associated tests. Those implementations
and every existing test are retained. All five existing migration files, including
the two untracked cutovers, are byte-for-byte unchanged from the incoming worktree.

| Files | Completed in this handover |
| --- | --- |
| `src/app.module.ts`, `src/database/data-source.ts` | Runtime and CLI share the same entity/migration options. All five migrations are registered in order. `synchronize` and `migrationsRun` are explicitly false. Existing OTP configuration validation is retained. |
| `package.json` | Start and migration CLI commands load the service-local `.env` with Node 22. Added read-only `migration:show`; no migration execution was added to startup. No dependency or lockfile changes. |
| `src/auth/auth.dto.ts`, `src/auth/auth.service.ts` | Accept frontend registration dob/phoneNumber and profile-update dob; registration persists these existing user fields. Existing password, OTP, refresh, OAuth, and event behavior is retained. |
| `src/auth/auth.controller.ts` | Logout without a refresh header/cookie now returns the existing 200 success/data envelope and clears the cookie, rather than an empty response. Supplied refresh tokens still use existing session revocation. |
| `src/admin/admin-user.dto.ts`, `src/admin/admin-user.service.ts` | Accept legacy lowercase roles/statuses and `all` filters, verified/date filters, newest/oldest sorting, and optional status reason. Preserve canonical output enums; add joinDate, filtered, updatedAt/reason response aliases and deletedUserId. Reasons are echoed, not stored. No payment or activity data is invented. |
| `src/health/health.controller.ts`, `src/health/readiness.service.ts` | Readiness returns 503 for DB/schema/broker failures and shutdown. DB checks select zero rows from mapped entities, detecting the pending OTP/refresh column changes without changing schema or data. Broker status follows the existing Nest RMQ command connection. Metrics uses Prometheus text content type; liveness remains independent. |
| `src/main.ts` | Enable SIGTERM/SIGINT shutdown hooks, retain RabbitMQ-before-HTTP startup, close the application on later startup failure, and report bootstrap rejection with a nonzero exit code. Existing Nest console logging and event/mail warning behavior remain. |
| `test/bootstrap.spec.ts`, `test/refactoring-http.spec.ts` | Eight focused lifecycle/HTTP tests cover the actual compatibility and operational fixes. Existing registration/profile and offline migration tests gain assertions for persisted frontend fields and disabled automatic migrations. |
| `.env.example`, `README.md`, `HANDOVER.md`, `contracts/auth/openapi.yaml` | Document the implemented API, environment, independent setup, manual cutover, Docker, probes, deferred issues and integration ownership. |

The existing Dockerfile and `.dockerignore` were verified and retained: Node 22
Alpine, multistage build, production dependencies, runtime `USER node`, direct
Node entrypoint, no secrets/tests/local modules copied into the image. They were
already modified/untracked on arrival; this handover does not claim those changes
were newly implemented.

The pre-existing root `docker-compose.auth-test.yml` and the oddly named untracked
file beginning `e exec auth-db` were left untouched for the original author to
review. No other microservice business logic or infrastructure files were edited.

## Service boundary and messaging

- Auth-owned repositories: users, refresh sessions, email OTPs, OAuth accounts,
  notifications. All entity relationships stay inside `auth_db`.
- Authentication, registration, profile reads/updates, password change/recovery,
  OAuth routes, notification reads/read markers/internal creation, admin user
  lists/details/status/role/deactivation are wired in the standalone AppModule.
- No old-monolith imports, other service entity imports, or cross-service SQL were
  found in service source. No additional database connection was introduced.
  Infrastructure must restrict the actual database principal to `auth_db`.
- `user.created` and `notification.created` retain their existing RabbitMQ envelope,
  routing keys and best-effort publisher. Publishing errors are logged and do not
  fail the HTTP operation. There is no durable outbox/replay guarantee.
- The existing `auth-commands` connection/queue is retained. There are currently
  no inbound command/event handlers; another service cannot create notifications
  merely by publishing an event to this service. Any required consumer is a
  separately scoped integration dependency.

## API compatibility findings

Compared controller routes/response bodies with the prior contract and both
`apps/react-client/src/services/{authService,userService}.ts` and
`apps/admin/src/services/{api,userService}.ts`, their DTOs, and active profile,
sign-up, OAuth callback and admin-list consumers.

| Difference | Resolution / remaining owner dependency |
| --- | --- |
| Contract `/api/auth` base did not match literal service paths and incorrectly prefixed user/probe paths. | Contract now describes literal `/auth/*`, `/users/*`, `/notifications/*`, `/admin/users/*`, `/health/*`, `/metrics`. Service has no `/api` prefix. Gateway aliases still require owner rewrites. |
| Contract described bare User/token-pair responses, UUID IDs, student/teacher/admin roles, integer token lifetime and 204 logout. | Document actual registration summary, success/data envelopes, integer IDs, `SuperAdmin/Admin/Support/User`, string duration, cookie-only refresh token output, 200 logout, profile-update message/user, and standard Nest errors. Existing frontend response shapes take precedence over the earlier target draft. |
| Contract omitted confirmPassword and most implemented routes. | Registration now documented with required confirmPassword; OAuth, notifications, admin, resend, details and legacy refresh are included. All 27 controller operations match the contract. |
| Frontend sends dob at registration/profile update and phoneNumber at registration; DTO whitelist rejected them. | Accepted and persisted within existing auth-owned fields. |
| Admin sends `all`, lowercase role/status, verified and sortBy; validation rejected normal list/status requests. | Normalize legacy values and apply existing identity filters/sorting; accept optional reason without adding a history table. Response aliases restore auth-owned fields consumed by the admin UI. |
| React logout assumes a response body, but absent cross-origin cookie produced an empty response. | Return the normal success envelope and clear the cookie even when absent. This cannot revoke an unspecified server-side session. Cookie delivery remains an integration requirement. |
| `/users/details` formerly implied wallet/payment aggregation. | Identity-only alias is documented; composition must happen outside auth_db. |
| Admin list/detail types require credits, purchases, spending, transactions and lastActivity. | These remain absent; the admin UI is not fully compatible until the integration owner composes Payment/activity data or updates those consumers. No fabricated zero balances or activity timestamps were added. |
| Frontend declares `/users/search`; no active call site was found. | Route remains unimplemented; document the 404 rather than add a feature in this task. Scope any future user search separately. |

The implemented Auth contract is an explicit compatibility exception to the older
string-ID/error-envelope target prose in `contracts/README.md` and
`docs/microservices-conventions.md`. The integration owner must confirm downstream
ID/JWT/error adapters; this task does not change other services' contracts.

## Remaining integration dependencies and acceptance blockers

1. **Database cutover and real persistence verification.** The owner must inspect
   auth_db migration history and schema, review backups/draining/rollback, and
   explicitly authorize the existing cutovers. Refresh hashing deletes sessions;
   OTP hashing deletes outstanding codes; rollbacks invalidate them too. Until
   schema and code agree, OTP/session operations cannot work and readiness returns
   503. No real PostgreSQL migration, concurrency, rollback, or constraint test was
   run here; existing offline tests inspect metadata/SQL and model transactions.
2. **Environment and secrets.** Supply a persistent independent OTP_HASH_SECRET to
   every replica along with JWT secrets, an auth_db-only database principal, broker
   credentials/vhost and working SMTP. Root Compose reads `apps/backend/.env`, not
   the new service-local template; an owner-maintained environment/override must
   provide the secret. `SMTP_REQUIRED=false` does not disable mail delivery errors.
   No real environment/secret file was edited.
3. **Live dependency and lifecycle smoke tests.** Run the service against the
   reviewed schema, broker and Mailpit/SMTP. Confirm registration, actual email
   receipt, verify/login/rotation/logout/reset, notifications/admin operations,
   event receipt, dependency outage/recovery and SIGTERM resource closure. Here,
   HTTP tests use in-memory/mocked persistence; startup wiring is tested with
   mocks. A live process with PostgreSQL/RabbitMQ/SMTP was not started.
4. **Gateway/frontend origin and cookies.** Existing root Nginx forwards literal
   paths correctly, but `/api/auth/*` and `/api/users/*` aliases preserve their
   prefixes and will 404 at this service. The admin default base `/api` also needs
   reconciliation (including `/api/admin/*`). Configure the intended gateway base
   or rewrites outside this service. React Axios and admin fetch omit cross-origin
   credentials; OAuth callback fetch includes them. Verify cookie storage/sending
   in the real browser origin/TLS setup. SameSite=Strict is unchanged.
5. **Payment/activity composition and routes.** Existing `/admin/users/:id/credits/*`
   requests are caught by the gateway's `/admin/users` route and have no User
   Service handler. Route them to their owning service/adapter; compose financial
   and lastActivity fields for admin pages outside auth_db. User Service does not
   query Payment/Academic databases to satisfy old aggregation types.
6. **OAuth provider configuration/acceptance.** Register externally reachable
   callback URLs, supply provider credentials and exercise provider redirects.
   Google/GitHub live flows were not verified. GitHub profiles without a public
   email currently fail as incomplete; the scoped `user:email` fallback is absent.
7. **Messaging/observability agreement.** Confirm existing queue/exchange bindings
   and event consumers, the best-effort delivery expectation, and whether inbound
   notification handling is needed. Readiness observes the command connection and
   DB columns, not SMTP/OAuth/publisher confirms or complete schema constraints.
   Metrics exposes only the process-up gauge. Startup probes must allow Nest's
   DB/broker retries before HTTP starts.

## Known security concerns deferred to the service owner

These are existing behavior observed during the requested refactoring review,
not the result of a new security audit. No new controls or dependency upgrades
were added.

- OAuth uses a provider-name state value without per-session state validation;
  provider email/account linking lacks explicit verified-email validation. These
  flows need owner review before production use.
- Access JWTs remain valid until expiration after password reset, status/role
  change or soft deactivation; refresh checks the stored user status. Admin guards
  authorize using JWT roles. Coordinated access-token revocation is absent.
- Existing login/register/reset behavior exposes some account-dependent errors or
  timing. OTP attempt/cooldown controls already exist, but no general per-IP/global
  abuse control was introduced. Production CORS still reflects origins if unset.
- Refresh response loss and concurrent browser refresh require client coordination;
  only one rotation wins. Cookies keep a fixed seven-day lifetime even when refresh
  JWT expiry is configured differently.
- SMTP work holds transaction locks; SMTP acceptance and DB commit are not atomic.
  Password-reset success is generic even when delivery fails. Retain the README's
  cutover, key-rotation, historical-backup and mail-failure caveats.
- The image's normal `npm ci` output reported **4 production dependency findings
  (3 moderate, 1 high)** and **30 full-install findings (5 low, 24 moderate, 1 high)**
  at verification time. No separate dependency/OWASP audit or remediation was run;
  the lockfile is unchanged. The owner must triage these reports before release.

## Verification performed

| Check | Result |
| --- | --- |
| `npm run lint` | Pass. |
| `npm test` | Pass: 10 suites, 89 tests (81 original tests retained, 8 focused additions). HTTP listeners require loopback permission in a sandbox. |
| `npm run build` | Pass: NestJS build. Local host Node v24.22.2; Node 22 compilation also passed inside Docker. |
| `git diff --check` | Pass. |
| Docker build | Pass: `domrov-user:handover`, Node 22 Alpine, runtime production dependencies. |
| Network-disabled image inspection | Node v22.23.4, UID 1000; valid generated OTP secret accepted by AppModule configuration; five migrations registered; synchronize/migrationsRun false; no DB connection initialized. |
| Contract comparison | Parsed YAML, checked 103 internal references, and compared compiled Nest controller metadata: 27 actual operations, 27 documented, no missing/extra paths or unresolved references. |
| Migration preservation | All five migration files compared byte-for-byte with the incoming worktree; unchanged. |

Jest may emit its existing ts-jest Node16/isolatedModules configuration warning;
it does not fail the suite. No test-toolchain changes were made for that warning.

## Final local verification commands

From the repository root (no schema or data changes):

```bash
cd apps/backend/user
npm ci
npm run lint
npm test
npm run build
cd ../../..
git diff --check
docker build -t domrov-user:handover apps/backend/user
docker run --rm --network none --entrypoint node domrov-user:handover \\
  -e 'console.log({node: process.version, uid: process.getuid()})'
```

After the owner supplies the environment and reviewed schema, from
`apps/backend/user`:

```bash
npm run migration:show  # read-only history inspection; does not apply migrations
npm start
# In another terminal:
curl --fail http://localhost:3001/health/live
curl --fail http://localhost:3001/health/ready
curl --fail -D - http://localhost:3001/metrics
```

Migration execution/reversion is deliberately excluded from routine verification.
Follow the README's separately reviewed manual cutover procedure. Do not delete
Docker volumes or use `down -v`. Handover is ready for owner review; integrated
acceptance remains blocked on the actions above.
