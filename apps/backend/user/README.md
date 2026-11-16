# User Service

Standalone NestJS User/Auth service, listening on port 3001. It owns only
`auth_db`: `users`, `user_refresh_token`, `user_email_otp`, `oauth_accounts`, and
`notifications`, plus TypeORM migration history. Repositories and entity imports
are local to this service; no monolith, Academic, or Payment database is queried.

Authentication, registration, profiles, password recovery, Google/GitHub OAuth
routes, notifications, and admin identity management are implemented. RabbitMQ
`user.created` and `notification.created` publishing is retained. Notifications
can be created internally; there is no public notification-create route or inbound
notification command handler. See [HANDOVER.md](HANDOVER.md) for acceptance blockers
and the boundary of frontend compatibility.

## Setup and independent execution

Prerequisites: Node **22.9+** (Node 22 LTS), npm, a reachable PostgreSQL `auth_db`
with the reviewed schema, RabbitMQ, and an SMTP server such as Mailpit. Other
microservices and the original monolith are not needed to run this service.

From this directory:

```bash
cp .env.example .env
npm ci
# Configure .env before starting; see the variables below.
npm run lint
npm test
npm run build
npm start
# Alternative during development:
# npm run start:dev
```

Generate three independent secrets using `openssl rand -hex 32` for each of
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `OTP_HASH_SECRET`; save them only
in the ignored `.env` or a secret manager. Never use the template JWT placeholders.
The blank template OTP secret deliberately prevents accidental startup. A valid
secret allows initialization; it cannot make an older database schema compatible.
No startup or build command runs migrations or schema synchronization.

Nest development startup loads this service's `.env` from the working directory.
`npm start` and migration CLI scripts explicitly load it with Node's
`--env-file-if-exists`; injected environment variables take precedence. Run these
commands from this directory. Do not load the monolith environment by accident.

## Environment

| Variable | Required / behavior |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL URL for **auth_db only**. Use a database-scoped account supplied by infrastructure. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Required independent signing secrets. Consumers need compatible access-JWT verification configuration. |
| `OTP_HASH_SECRET` | Required in every environment; independent of both JWT secrets, at least 32 bytes; production rejects obvious placeholders. See cutover details below. |
| `RABBITMQ_URL` | Required broker URL including the correct vhost and credentials. |
| `PORT` | Default `3001`. |
| `NODE_ENV` | Set `production` in the deployed runtime; controls Secure cookies and OTP configuration checks. |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Defaults `20h`, `7d`; JWT duration strings. Cookie lifetime remains seven days. |
| `AUTH_CORS_ORIGIN` | Frontend origin, e.g. `http://localhost:5173`. If absent, the existing origin-reflection behavior is preserved. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Required for functioning registration/resend/recovery email delivery. Mailpit: host DNS name, port `1025`, a sender address. Default port `587`; `465` enables TLS. |
| `SMTP_USER`, `SMTP_PASSWORD` | Optional, configured together for authenticated SMTP. `SMTP_PASS` is a legacy fallback only when `SMTP_PASSWORD` is unset. |
| `RABBITMQ_AUTH_QUEUE` | Default `auth-commands`; existing command connection, with no inbound business handlers currently defined. |
| `RABBITMQ_AUTH_EVENTS_QUEUE` | Default `auth-events`. |
| `RABBITMQ_EVENTS_EXCHANGE` | Default `domrov.events`, durable topic exchange. |
| `FRONTEND_URL` | Default `http://localhost:5173`; OAuth callback redirects to `/auth/callback` here. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Optional provider configuration; all three needed to enable Google OAuth. Callback path `/auth/google/callback`. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | Optional provider configuration; all three needed to enable GitHub OAuth. Callback path `/auth/github/callback`. `GIT_HUB_*` aliases are retained. |

`SMTP_REQUIRED` no longer suppresses delivery errors. Without configured SMTP,
registration/resend fail (except in unit test mode), and reset requests keep their
generic public response. SMTP is not checked by readiness.

## Database migrations — manual owner action

Both CLI and application configuration use the same five registered migrations:

1. `1763000000000-InitialAuthSchema`
2. `1763000001000-AddOAuthAccounts`
3. `1763000002000-AddNotifications`
4. `1763000003000-HashRefreshTokens`
5. `1763000004000-HardenEmailOtps`

`synchronize: false` and `migrationsRun: false` are explicit. Readiness probes the
mapped tables with zero-row SELECTs and returns 503 on a missing table/column.
It does not apply migrations or fully validate database constraints/history.

After building, inspect migration history without changing it:

```bash
npm run migration:show
```

Only after the database/service owner reviews and authorizes the cutover:

```bash
# MUTATING — do not include in container startup or routine verification:
npm run migration:run
# MUTATING rollback, only under the reviewed recovery plan:
# npm run migration:revert
```

The two cutover migrations delete refresh sessions and outstanding OTP records,
respectively. Their rollback also invalidates records. Existing user accounts are
retained. Review forced re-login, outstanding-code invalidation, backups, locks,
application draining, deployment order, and rollback before any execution. Do not
edit historical migrations or point the service at the monolith database. No
migration was executed as part of this handover.

## REST API

The exact contract is [contracts/auth/openapi.yaml](../../../contracts/auth/openapi.yaml).
Paths below are literal service routes, with **no global `/api` prefix**. The
contract preserves numeric user IDs and existing frontend envelopes. Most
successful responses are `{ success: true, data: ... }`; `/auth/register` returns
a bare `{ userId, firstName, lastName, email }`. Nest validation/authentication
errors use `{ statusCode, message, error }`, where `message` can be an array.

| Method | Path | Authentication / result |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/sign-up` | Public; registration summary, enveloped on sign-up; 201. |
| POST | `/auth/login` | Public; access token and duration in data, HttpOnly refresh cookie; 200. |
| POST | `/auth/verify-email` | Public email and OTP; token data plus message and refresh cookie. |
| POST | `/auth/refresh` | Refresh JWT in body or cookie; rotated cookie, access token and string duration. |
| POST | `/auth/refresh-token` | Cookie; legacy `{ status, accessToken, issuedAt }` in data. |
| POST | `/auth/logout` | Bearer JWT; optional `X-Refresh-Token` or cookie; 200 envelope and clear cookie. A missing refresh token clears the browser cookie without server-side revocation; an unknown supplied session returns 404. |
| POST | `/auth/resend-verification` | Public email; message. |
| POST | `/auth/request-password-reset` | Public email; generic message. |
| POST | `/auth/reset-password` | Public email, OTP and newPassword; message. |
| GET | `/auth/{provider}/login`, `/auth/{provider}/callback` | Google/GitHub redirects; unconfigured providers return 503. |
| GET | `/users/me`, `/users/details` | Bearer JWT; identity profile only. |
| PATCH | `/users/me` | Bearer JWT; firstName, lastName, gender, dob, phoneNumber, profilePictureUrl; message and user. |
| POST | `/users/change-password` | Bearer JWT; currentPassword, newPassword, confirmPassword; message. |
| GET | `/notifications`, `/notifications/unread` | Bearer JWT; current user's newest 100 notifications. |
| PATCH | `/notifications/:id/read` | Bearer JWT; owner-scoped read marker. |
| GET | `/admin/users`, `/admin/users/:id` | Admin/SuperAdmin; identity list/detail. |
| PATCH | `/admin/users/:id/status` | Admin/SuperAdmin; status plus optional reason (echoed, not stored). |
| PATCH | `/admin/users/:id/role` | SuperAdmin; canonical or lowercase role input. |
| DELETE | `/admin/users/:id` | SuperAdmin; soft deactivation, message and deletedUserId. |
| GET | `/health/live`, `/health/ready`, `/metrics` | Public operational endpoints. |

Admin lists accept page, limit (max 100), search, status, role, verified,
joinDateFrom, joinDateTo and sortBy (`newest`/`oldest`). Legacy `all` filters and
lowercase role/status inputs are normalized to stored enum values. Output retains
canonical roles/statuses, adds joinDate, and reports filtered. No financial values
or activity timestamps are fabricated. There is no `/users/search` implementation;
the frontend contains an unused helper for that route.

Cookies remain HttpOnly, SameSite=Strict, Secure in production, with a seven-day
lifetime. Refresh tokens are never returned in JSON. Browser refresh/logout needs
a shared API origin or a client that includes credentials. The existing React
Axios client and admin fetch client omit cross-origin credentials; infrastructure
must validate the intended frontend origin/cookie setup before acceptance.

## Docker

From the repository root:

```bash
docker build -t domrov-user:local apps/backend/user
# Configure apps/backend/user/.env with container-reachable DATABASE_URL,
# RABBITMQ_URL and SMTP_HOST first. Example network from the existing Compose stack:
docker run --rm --name domrov-user --network domrov_default \
  --env-file apps/backend/user/.env -p 3001:3001 domrov-user:local
# From another terminal, exercise graceful SIGTERM handling:
docker stop --time 30 domrov-user
```

The multistage image uses Node 22 Alpine and runtime UID 1000 (`node`), installs
only production dependencies in the final image, and excludes `.env`, tests, local
modules and build artifacts from its context. Its command starts only the app.
Dependencies/network must already exist; this does not start the rest of the LMS.
The root Compose User Service currently reads `apps/backend/.env`; the integration
owner must inject `OTP_HASH_SECRET` and configure working mail delivery there or
in an owner-maintained override. The root Compose/gateway files were not changed.

## Health, metrics, startup and shutdown

```bash
curl --fail http://localhost:3001/health/live
curl --fail http://localhost:3001/health/ready
curl --fail -D - http://localhost:3001/metrics
```

Liveness returns `{ status: "ok", service: "user" }` while HTTP is running.
Readiness returns 200 only when mapped database tables/columns are queryable and
the RabbitMQ command connection reports connected/unblocked; otherwise 503.
A dependency failure after startup changes readiness without stopping the process.
Database initialization and RabbitMQ startup precede HTTP listening; unreachable
dependencies can keep startup pending while Nest retries. Set infrastructure
startup-probe budgets accordingly. Readiness does not test SMTP, OAuth providers,
RabbitMQ publisher confirms, or the full schema constraints.

Metrics returns Prometheus text (`text/plain`, version `0.0.4`) with
`auth_service_up 1`; it is a process gauge, not dependency or business metrics.
Nest signal hooks close HTTP, TypeORM, and RabbitMQ resources on SIGTERM/SIGINT;
partially started applications are closed if later startup fails. Nest's existing
console logger and event/mail warning behavior are retained. There is no new
request logger, audit pipeline, or logging format change.

## Known limitations and acceptance

See [HANDOVER.md](HANDOVER.md) for the verified change inventory, unresolved
frontend/infrastructure dependencies, existing security concerns deferred to the
service owner, and final verification commands. The detailed existing refresh/OTP
behavior and cutover caveats are retained below.

## Refresh session hashing cutover

Refresh JWTs contain a unique `jti`; only their SHA-256 hashes are stored in
`user_refresh_token.token_hash`. Each refresh replaces the matching hash using a
conditional PostgreSQL UPDATE and requires exactly one affected row. Reused,
revoked, expired, and inactive-user sessions receive HTTP 401. Separate logins
remain separate device sessions. Session expiry follows the signed JWT `exp`.
The existing endpoints and HttpOnly cookie attributes remain unchanged.

The NEW `1763000003000-HashRefreshTokens` migration is a development cutover:
it locks the refresh-session table, deletes all existing sessions, adds the unique
hash column, and drops the plaintext column. Everyone must log in again. Its
rollback also deletes refresh sessions because hashes cannot recover raw tokens.
Existing migration files are unchanged. Run the migration transactionally using
TypeORM's default transaction mode; do not use `--transaction none`.

**Production requires a reviewed migration and deployment cutover plan before
applying this migration.** Coordinate application shutdown/draining and the schema
change: old application instances require the plaintext column and new instances
require the hash column, so mixed-version operation is unsupported. Review the
table lock, forced sign-in impact, backups containing historical plaintext tokens,
and rollback procedure. Never log request cookies, token headers, or raw JWTs.
Parallel browser refresh calls must be coordinated: one wins and others get 401.
A lost successful refresh response requires signing in again because rotation has
already invalidated the previous cookie. Cookie lifetime remains seven days;
JWT/session expiry is authoritative when a different JWT lifetime is configured.

## OTP security and development cutover

Set `OTP_HASH_SECRET` in the user service environment before startup. It is required
in every environment, must contain at least 32 bytes, and must differ from both JWT
secrets. Generate a separate random value with `openssl rand -hex 32` and place it
only in your untracked `.env` or secret manager. Production also rejects common
placeholders and low-diversity values. These checks cannot prove randomness; use a
cryptographic generator. Never commit, print in diagnostics, or log the key or OTPs.
All instances must use the same key. Changing the key invalidates outstanding codes.

New codes use `crypto.randomInt`. Only a 64-character lowercase HMAC-SHA256 digest
is stored, with a versioned input containing the user ID, purpose, and code.
Verification uses `timingSafeEqual` on fixed-length digests. Codes expire ten
minutes after server issuance. Five incorrect attempts invalidate a code; successful
consumption also expires it. Both counters and consumption commit inside a transaction.
Password changes and refresh-session revocation during reset share that transaction.

Issuance and verification lock the user row first, then the OTP row with PostgreSQL
`FOR UPDATE`. This also serializes issuance when no OTP row exists. The persisted
`issued_at` enforces a 60-second cooldown across instances. Records remain after
consumption or exhaustion so requests cannot bypass the cooldown. After cooldown a
new issuance resets attempts and expiry. The existing single OTP slot per user is
preserved: verification and reset share the cooldown, and a new issuance replaces
the previous purpose. Each verification accepts only its own purpose.

The new `1763000004000-HardenEmailOtps.ts` migration is a **development cutover**.
It locks the OTP table, invalidates all outstanding codes, adds `otp_hash`,
`failed_attempts`, and `issued_at` with hash/attempt constraints, then drops plaintext
`otp`. Rollback invalidates codes too; hashes cannot recover them. Existing migrations
are unchanged. No migration is executed by building or testing this change.

**Production rollout requires review before applying this migration.** Review
backups containing historical plaintext codes, the exclusive table lock, key
provisioning, draining old instances, deployment order, user impact, and rollback.
Old and new application instances cannot share the changed schema. Run the reviewed
cutover transactionally with TypeORM's default migration transaction mode, never
`--transaction none`. This task does not apply it.

Mailpit remains supported with `SMTP_HOST`, `SMTP_PORT=1025`, and no SMTP credentials.
Authenticated SMTP still supports `SMTP_PASSWORD` and legacy `SMTP_PASS`. SMTP
failures now always fail registration/resend verification operations and roll back
OTP issuance; `SMTP_REQUIRED=false` no longer hides these failures. Existing users
can retry resend after delivery recovers; a registration delivery failure leaves the
created unverified account, which can use the same resend endpoint. Public reset
requests retain the same generic success response for unknown accounts, cooldown,
and SMTP failure; invalid reset completion uses one error for unknown accounts and
invalid codes. No response includes an OTP, digest, or secret. Upstream SMTP error
details are never logged. As before, test mode permits an absent SMTP transport.

Limitations and manual verification:

- Unit concurrency tests model serialized transactions; offline PostgreSQL tests
  inspect generated `FOR UPDATE` SQL and mocked migration queries. On an approved
  test database after a separately authorized cutover, verify real concurrent
  attempts, resends, one-time consumption, transaction rollback, and constraints.
- Manually verify actual Mailpit receipt and SMTP outage/recovery after configuring
  the new secret and schema. SMTP delivery runs while locks are held, with 10-second
  connection/greeting/socket timeouts. Delivery and database commit cannot be atomic:
  a commit failure after accepted mail can leave an unusable emailed code, and an
  SMTP timeout can occur after remote acceptance. Retry after recovery.
- Password-reset response content/status is uniform for account-dependent outcomes,
  but synchronous SMTP and database work still have timing differences. Per-IP or
  global abuse controls, uniform asynchronous reset delivery, and distributed clock
  synchronization remain operational work; this change limits attempts per issued
  code and issuance per account, not requests across many accounts.
- A successful verification consumes its code before token signing. If signing fails,
  the account stays verified and can sign in normally. Existing access JWTs remain
  valid until expiry after password reset, as before; stored refresh sessions are revoked.
