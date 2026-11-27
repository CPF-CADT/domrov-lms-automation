# DOMROV security audit 02 · Sensitive data exposure and XXE

**Reviewed 27 November 2026** · Git HEAD `54547c26` · Read-only source and configuration review

Reviewed the NestJS and Go services, the student and admin frontends, Compose, CI, Terraform, logging configuration, and upload and parsing paths. Evidence cites repository-relative paths and line numbers. Credential values are masked. Severity reflects source evidence and the deployment conditions described below. Running services, deployed settings, real logs, database contents, and full repository history were outside the verification scope.

**Results** · 4 High, 8 Medium, 1 Low. XXE is **Not Applicable** to the reviewed application paths.

## Sensitive data exposure

### DE-01 · High · Evaluation records are returned without application authorization

- **Evidence** — `apps/backend/evaluation/src/http.controller.ts:14–30` defines an unguarded evaluation detail handler and an unguarded status handler. They return the full record and the full list, respectively. Guard annotations exist on neighboring handlers. `apps/backend/evaluation/src/evaluation.entity.ts:7–24` defines user and billing IDs, submission IDs, resource keys, scores, feedback, and error details on those records. `docker-compose.yml:225–226` publishes the evaluation service port. `infra/gateway/nginx.conf.template:121` forwards the evaluations prefix.
- **Potential impact** — A caller with access to the service can receive student evaluation and billing metadata. The detail handler is routed by the gateway, and the full-list handler depends on direct service reachability or other routing. Live reachability was unverified.
- **Recommended fix** — Require authentication and enforce submission ownership or the appropriate class role on detail reads. Remove the full-list status handler or require an admin guard and return aggregate health information. Keep the backend service on the internal network and use explicit response fields.

### DE-02 · High · Compose and the execution service contain fallback secrets

- **Evidence** — `docker-compose.yml:82–83,123,171–172,238,298,332–338,538` supplies checked-in fallback values for JWT signing, payment service authentication, RabbitMQ, and Grafana credentials. Example pattern: `JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-[MASKED]}"`. The RabbitMQ service publishes broker and management ports. `apps/backend/code-execution-go/cmd/server/main.go:139` also supplies a credential-bearing broker URL fallback (masked).
- **Potential impact** — Deployments that omit overrides can accept publicly knowable credentials across signing and service boundaries. Broker access can expose or alter queued application data. Grafana impact depends on reachability and the data sources its account can read.
- **Recommended fix** — Require deployment secrets at startup, inject them from a secrets manager, and use dedicated RabbitMQ users with permissions scoped to their queues and exchanges. Keep broker and management ports private. Rotate any fallback values used in deployed environments and invalidate affected sessions.

### DE-03 · High · User-supplied AI provider keys are stored in plaintext

- **Evidence** — `apps/backend/evaluation/src/user-ai.controller.ts:33–38,42–48` passes the submitted key to `Repository.save()` on create and update. `apps/backend/evaluation/src/user-ai.entity.ts:12–16` declares `@Column({ type: 'text' }) apiKey!: string;` without a column transformer. The response mapper strips `apiKey` at `apps/backend/evaluation/src/user-ai.controller.ts:64`.
- **Potential impact** — A database read, dump, or backup disclosure can expose reusable third-party API keys and lead to provider charges or other actions allowed by those keys.
- **Recommended fix** — Store a reference to a managed secret or use authenticated envelope encryption backed by KMS. Fetch or decrypt only where the provider call needs the credential. Migrate existing rows and rotate credentials if exposure is suspected. Use explicit request and response fields so later model changes preserve the protection.

### DE-04 · High · The database stores reusable refresh tokens

- **Evidence** — `apps/backend/user/src/auth/auth.service.ts:74–84,179–182,274–279` looks up, deletes, and stores the complete refresh token. `apps/backend/user/src/entities/user-refresh-token.entity.ts:16–20` defines the raw token and expiry columns.
- **Potential impact** — Disclosure of the session table or a readable backup can expose active sessions until the tokens expire or are revoked.
- **Recommended fix** — Store an indexed SHA-256 digest or keyed fingerprint of each high-entropy refresh token. Use the digest for lookup and revocation, migrate or invalidate existing sessions, and keep raw tokens confined to issuance and client cookie handling.

### DE-05 · Medium · PostgreSQL application URLs embed a shared fallback login

- **Evidence** — `docker-compose.yml:80,121,168,235,295` embeds the same literal PostgreSQL username and password in five application URLs. Masked form: `postgresql://[MASKED]:[MASKED]@…`. Each corresponding database has a password override at `docker-compose.yml:364,386,408,430,452`. `apps/backend/code-execution-go/cmd/server/main.go:57` has a separate credential-bearing database fallback.
- **Potential impact** — A service with network access to a database deployed with the defaults can use the shared login. Changing only the database password variable also leaves the application URL using the old literal and can break startup.
- **Recommended fix** — Inject a distinct application DSN or secret-backed connection configuration for each service, paired with its database configuration. Use restricted application and migration roles and reject missing production credentials.

### DE-06 · Medium · Terraform materializes the RDS password as a local file

- **Evidence** — `terraform/modules/database/main.tf:12–25,48–50,84–86` generates a password, writes it to `${path.root}/.db_password`, then reads it back for Secrets Manager and the RDS instance. The password file and standard state paths are covered by ignore rules in the current checkout.
- **Potential impact** — Workstation, CI workspace, backup, or state disclosure can expose the RDS credential. Git ignore controls tracking and leaves those copies readable by actors with access to the corresponding storage.
- **Recommended fix** — Use RDS-managed master credentials in Secrets Manager and a separate least-privilege application credential. Remove the local file round trip and use an encrypted, access-controlled Terraform state backend and protected plan artifacts.

### DE-07 · Medium · Database and broker transport encryption is not required by checked-in configuration

- **Evidence** — `terraform/modules/database/main.tf:32–39,88–97` applies a PostgreSQL parameter group with `rds.force_ssl` set to disabled, while enabling encryption at rest. The Compose application DSNs at `docker-compose.yml:80,121,168,235,295` omit explicit TLS enforcement, and the broker URLs at `docker-compose.yml:85,125,175,241,301` use `amqp://`. The Terraform load balancer terminates client HTTPS at `terraform/modules/load_balancer/main.tf:43–52` and forwards over an HTTP target group at lines 9–13.
- **Potential impact** — Credentials, submissions, or billing events can be exposed to an actor with access to plaintext internal traffic. Actual exposure depends on deployed network segmentation, client configuration, and overrides.
- **Recommended fix** — Enforce TLS and certificate verification for deployed database and broker connections. Use verified encrypted upstream traffic where the application tier crosses a network trust boundary and restrict internal network access.

### DE-08 · Medium · Verification and password-reset codes are stored in plaintext

- **Evidence** — `apps/backend/user/src/auth/auth.service.ts:243–247,263–268,283–289` writes the generated code directly and compares the supplied code against that stored value. `apps/backend/user/src/entities/user-email-otp.entity.ts:21–22` declares the OTP field.
- **Potential impact** — A database read can expose unexpired verification or reset codes and their user associations.
- **Recommended fix** — Store a keyed HMAC of the code bound to its user and purpose, keep the HMAC key outside the database, compare digests in constant time, and retain short expiry and single-use consumption. A plain unsalted hash is readily enumerable for short numeric codes.

### DE-09 · Medium · Payment admin responses include unrestricted provider metadata

- **Evidence** — `apps/backend/payment/src/payment.service.ts:155–165,231–233,369–371` stores the provider transaction and receipt metadata, then returns nested metadata objects in admin transaction responses. `apps/backend/payment/src/bakong.provider.ts:26` lists account identifiers, descriptions, amounts, and timestamps on provider transactions. `apps/backend/payment/src/admin-wallet.controller.ts:25,42–44` applies admin guards. The regular payment mapper at `apps/backend/payment/src/payment.service.ts:65–75` uses selected fields.
- **Potential impact** — Admin API clients can receive account identifiers, payment descriptions, internal receipt keys, and future provider fields beyond what the transaction view needs. Those values can propagate into client-side diagnostics or exports.
- **Recommended fix** — Define explicit admin list and detail DTOs. Return references and summaries needed for the workflow, mask account identifiers, and gate access to full provider or receipt data behind a separate, narrower support permission.

### DE-10 · Medium · Admin access tokens are persisted in browser storage

- **Evidence** — `apps/admin/src/context/authContext.tsx:69–74,99–108` restores and stores the access token and admin profile in `localStorage`. `apps/admin/src/services/api.ts:15–18,73–75` reads the saved token and sends it as a bearer credential.
- **Potential impact** — Script execution in the admin origin can read the persistent token and profile. The access token can remain in browser storage after the tab closes.
- **Recommended fix** — Use a secure HTTP-only session or keep short-lived access tokens in memory with an HTTP-only refresh cookie. Apply CSRF controls if switching protected API requests to cookie authentication. Keep the stored profile to the fields needed by the UI.

### DE-11 · Medium · Browser upload logs can include authenticated request details

- **Evidence** — `apps/react-client/src/services/FileUploadService.ts:152–156,187–190` logs the upload notification response, resource identifiers, and a raw error object. The upload uses Axios at lines 130 and 152, and `apps/react-client/src/lib/AxiosInstance.ts:26` adds the bearer token to request headers.
- **Potential impact** — Depending on the failure, the browser console can retain an Axios error with request configuration, authorization headers, submission metadata, or response data. Console capture and support recordings can increase the audience for those details.
- **Recommended fix** — Remove production console dumps and report explicit status, operation, safe error code, and correlation ID. Exclude raw Axios errors, request headers and bodies, and signed URLs from any frontend telemetry.

### DE-12 · Medium · SMTP configuration allows opportunistic encryption

- **Evidence** — `apps/backend/user/src/mailer/mailer.service.ts:11–19` sets implicit TLS for port 465 and supplies SMTP credentials. The configuration for other ports does not set `requireTLS`. Lines 35–39 put verification and reset codes in the message body.
- **Potential impact** — When the SMTP transport does not negotiate STARTTLS on a non-465 connection, the application can send sensitive email over an unencrypted first hop, depending on server and authentication behavior.
- **Recommended fix** — Require STARTTLS for the submission port or use implicit TLS on 465. Keep server certificate verification enabled and fail delivery when the configured encrypted connection cannot be established.

### DE-13 · Low · Raw evaluation errors are persisted and forwarded

- **Evidence** — `apps/backend/evaluation/src/ollama-evaluation.service.ts:104–112` wraps exception text in a service exception. `apps/backend/evaluation/src/evaluation.service.ts:136–140,220–222` persists `error.message` as `errorCode` and publishes it in the result. `apps/backend/evaluation/src/http.controller.ts:26–27` serializes records as described in DE-01.
- **Potential impact** — Dependency and parser exceptions can carry internal details or fragments of response data into stored records, RabbitMQ messages, and serialized responses. No specific secret value was observed in such an error.
- **Recommended fix** — Use a bounded set of error identifiers, generic external messages, and correlation IDs. Keep approved diagnostic fields in protected logs and apply DE-01's response controls.

## XXE review

| Check | Result | Source evidence |
| --- | --- | --- |
| Application endpoints parsing user-supplied XML | Not Applicable | The reviewed upload, evaluation, OCR, and provider paths did not invoke an application XML parser on user input. The Bakong response is read with `response.json()` in `apps/backend/payment/src/bakong.provider.ts:155`. |
| XML inside DOCX or PPTX attachments | Not Applicable | `apps/backend/academic/src/academic.service.ts:301–325` streams attachments and classifies document extensions. The evaluation path at lines 362–398 opens eligible ZIP archives, selects allowlisted source extensions from line 15, and decodes source bytes as UTF-8. It does not process Office XML relationships or embedded XML parts. |
| XML within receipt processing | Not Applicable | `apps/backend/payment/src/payment-proof-ocr.service.ts:19–25,58–61,99–104` checks for raster receipt formats and runs Tesseract with text output. |
| Application parser settings for DTDs, external entities, and XInclude | Not Applicable | No reachable application XML parser for these inputs was identified in the reviewed source and manifests. SDK internals and private dependencies were outside this parser review. |

## Other review observations

- **Repository and environment** — The root runtime `.env` and `.env.production` files are ignored. The credential review used tracked configuration and environment wiring. It did not read real secret values from runtime files. GitHub Actions references repository secrets for registry, SSH, and AWS credentials in `.github/workflows/ci-cd-pipeline.yml:75–78,111–115,155–162,188–195`.
- **Backend logs** — The reviewed user-service request logger uses a route template and status metadata in `apps/backend/user/src/logging/index.ts:193–206`. The gateway log format uses a mapped route and request metadata in `infra/gateway/nginx.conf.template:65–72`. The reviewed receipt OCR logger drops raw OCR output and stderr content in `apps/backend/payment/src/payment-proof-ocr.service.ts:71–102`.
- **Existing protections and deployment verification** — Passwords are hashed with bcrypt in `apps/backend/user/src/auth/auth.service.ts:48,225,265`. RDS declares encryption at rest in `terraform/modules/database/main.tf:96–97`. Compose uses local storage for academic files and a bind mount for payment receipts at `docker-compose.yml:131,195–198`. Encryption and retention for the actual storage volumes and backups require deployment verification.

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
