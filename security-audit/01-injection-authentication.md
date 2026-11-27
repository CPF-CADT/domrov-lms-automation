# Security Audit 01 — Injection & Broken Authentication

| | |
|---|---|
| **Target** | DOMROV LMS (`apps/backend/*`, `apps/backend/code-execution-go`, `apps/react-client`, `apps/admin`, `docker-compose.yml`) |
| **Date** | 2026-11-27 |
| **Scope** | (1) Injection — SQL/command/input validation; (2) Broken Authentication — JWT, password hashing, token lifetime, refresh tokens, sessions, login rate limiting |
| **Mode** | Read-only static review. No code was modified. |
| **Out of scope** | Authorization/business-logic beyond auth boundaries, secrets committed to git, dependency CVEs, infrastructure hardening, LLM prompt injection |

## Executive Summary

| ID | Severity | Category | Finding | Primary location |
|---|---|---|---|---|
| INJ-01 | **High** | Command injection | Code-execution sandbox relies on a bypassable substring blocklist and runs commands through `sh -lc` | `apps/backend/code-execution-go/internal/execution/sandbox.go:39-53,130` |
| INJ-02 | **High** | Sandbox escape | Docker socket mounted into the code-execution service; sandbox containers run as root with no user namespace isolation | `docker-compose.yml:309`, `sandbox.go:130` |
| INJ-03 | **High** | Mass assignment | Untyped `@Body()` + `Object.assign` lets a user change primary key `id`/`userId` of AI credential rows, overwriting another user's record | `apps/backend/evaluation/src/user-ai.controller.ts:33-46` |
| INJ-04 | Low | Mass assignment | Admin package update spreads unvalidated body onto entity (`id` can be overwritten) | `apps/backend/payment/src/admin-wallet.controller.ts:31`, `payment.service.ts:93` |
| AUTH-01 | **High** | Broken authentication | Go execution service verifies JWT signature but never checks `exp`/`nbf`/`iat`/`iss`/`aud`; expired or replayed tokens stay valid forever | `apps/backend/code-execution-go/cmd/server/main.go:254-290` |
| AUTH-02 | **High** | Weak secrets | Default JWT/service secrets (`local-*`) accepted by Compose and the Go service; only the user service rejects them in production | `main.go:72`, `docker-compose.yml:82,83,123,171,172,238,298` |
| AUTH-03 | **High** | Brute force | No login rate limiting, throttling, CAPTCHA, or account lockout anywhere | `apps/backend/user/src/auth/auth.service.ts:63-72` |
| AUTH-04 | **High** | OTP brute force | 6-digit OTP with unlimited attempts and non-constant-time comparison; verify/reset endpoints unthrottled | `auth.service.ts:239-264` |
| AUTH-05 | Medium | Session management | Refresh tokens stored in plaintext, no rotation or reuse detection, no user-status re-check | `user-refresh-token.entity.ts:16-17`, `auth.service.ts:74-85,273-280` |
| AUTH-06 | Medium | Token lifetime/revocation | 20-hour access tokens; guard trusts claims without DB status check; banning/deactivating a user does not revoke tokens | `app.module.ts:51`, `jwt-auth.guard.ts:10-20`, `admin-user.service.ts:35-60` |
| AUTH-07 | Medium | Enumeration | Distinct responses reveal whether an email is registered/verified | `auth.service.ts:42,66-68,242` |
| AUTH-08 | Medium | OAuth account takeover | OAuth login links to an existing account by email without checking the provider's `email_verified` claim | `auth.service.ts:118-131` |
| AUTH-09 | Medium | Secret comparison | `ServiceAuthGuard` compares the shared service token with `!==` (not timing-safe) | `apps/backend/payment/src/auth.guard.ts:5` |
| AUTH-10 | Medium | Missing authentication | Evaluation results, admin status, and metrics are exposed without any guard | `apps/backend/evaluation/src/http.controller.ts:19,26,27` |
| AUTH-11 | Low | Token storage | Access and refresh tokens persisted in `localStorage` in both frontends (XSS token theft) | `apps/react-client/src/lib/Storage.ts`, `apps/admin/src/services/api.ts:16-18` |
| AUTH-12 | Low | Abuse/DoS | OTP resend has no cooldown; a single OTP record is overwritten, enabling mail bombing and invalidating a victim's code | `auth.service.ts:282-290` |
| AUTH-13 | Low | Password hashing | bcrypt work factor 10 is below current guidance | `auth.service.ts:48,129,225,265` |
| AUTH-14 | Low | Session termination | Logout requires a valid access token, so an expired access token cannot revoke the refresh token | `auth.controller.ts:47-56`, `auth.service.ts:179-182` |

**SQL injection:** No exploitable SQL injection was found. All reviewed raw query paths use bound parameters (details in [Verified non-findings](#verified-non-findings)).

---

## Injection Findings

### INJ-01 — Sandbox command blocklist is bypassable and commands run through `sh -lc`

**Severity:** High
**CWE:** CWE-78 (OS Command Injection), CWE-184 (Incomplete List of Disallowed Inputs)
**Location:** `apps/backend/code-execution-go/internal/execution/sandbox.go:39-53`, `:130`

**Evidence**

```go
// sandbox.go:39-53
func validateCommand(command string) error {
	trimmed := strings.TrimSpace(command)
	if trimmed == "" || len(trimmed) > 1000 { ... }
	if strings.Contains(trimmed, "..") || strings.ContainsAny(trimmed, "\x00\r\n") { ... }
	for _, blocked := range []string{"sudo", "docker", "podman", "nsenter", "mount", "unshare", "/proc", "/sys", "/dev/tcp", "curl", "wget", "ssh", "nc"} {
		if strings.Contains(strings.ToLower(trimmed), blocked) {
			return fmt.Errorf("command contains blocked operation: %s", blocked)
		}
	}
	return nil
}
```

```go
// sandbox.go:130
args := []string{"run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL",
	"--security-opt", "no-new-privileges", "--memory", ..., "--pids-limit", "64",
	"--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "-v", workspace + ":/workspace:rw",
	"-w", "/workspace", image, "sh", "-lc", req.Command}
```

**Why it is exploitable**

The blocklist is a case-insensitive substring match, not a parser, and the command is executed by a real shell (`sh -lc`). Bypasses include:

- Quoting/escaping: `su""do`, `c\url`, `n''c`, `mo''unt`, `wge''t`
- Variable expansion: `a=cur; b=l; $a$b http://...`
- Absolute paths or alternate tools: `/usr/bin/python3 -c '...'`, `busybox wget`, `perl`, `php`, `ruby`, `openssl s_client`
- Shell features: `$(...)`, backticks, pipes, redirections, `&&`, `;`
- Base64/`printf` reconstruction: `echo aWQ= | base64 -d | sh`

Because the sandbox container runs with `--network none`, arbitrary network egress is mitigated, but arbitrary code execution inside the container, filesystem writes to the bind-mounted workspace (`:rw`), reading of mounted files, and resource abuse are all possible. `--read-only` only protects the container rootfs; `/workspace` is explicitly read-write.

**Impact**

An authenticated teacher (or anyone who obtains a valid access token — see AUTH-01/AUTH-02) can execute arbitrary shell commands inside the runner container. This is the intended feature, but the blocklist creates a false sense of restriction and the container hardening is the only real boundary. If any container-escape primitive exists, the Docker socket (INJ-02) turns this into host compromise.

**Recommendation**

- Do not rely on a blocklist. Treat the command as fully untrusted and rely on container isolation as the security boundary.
- If a restricted command set is required, parse and allowlist argv (no shell), e.g. `["python3", "main.py"]`, and execute with `exec.CommandContext(ctx, binary, args...)` instead of `sh -lc`.
- Run the sandbox as a non-root user (`--user 65534:65534`), add `--userns-remap`/rootless Docker or gVisor/Firecracker, and drop the workspace bind mount in favor of a copy-in/copy-out approach.
- Keep `--network none`, `--read-only`, `--cap-drop ALL`, `--no-new-privileges`, seccomp/AppArmor profiles, and strict CPU/memory/PID/time limits.

---

### INJ-02 — Docker socket exposed to the code-execution service; sandbox runs as root

**Severity:** High
**CWE:** CWE-250 (Execution with Unnecessary Privileges), CWE-269 (Improper Privilege Management)
**Location:** `docker-compose.yml:309`; `apps/backend/code-execution-go/internal/execution/sandbox.go:130`

**Evidence**

```yaml
# docker-compose.yml:309
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - "${CODE_EXECUTION_WORKSPACE_DIR:-/tmp/domrov-execution}:/tmp/domrov-execution"
```

```go
// sandbox.go:130 — no --user flag
args := []string{"run", "--rm", "--network", "none", "--read-only", ...}
```

**Impact**

Mounting the host Docker socket gives the code-execution container effective root on the host: it can start privileged containers, mount the host filesystem, and read every image/volume. Any RCE in the Go service (e.g. via a dependency, an unvalidated request path, or the command execution path) becomes full host compromise. The spawned sandbox containers also run as root inside their container, increasing the impact of a container escape.

**Recommendation**

- Prefer a rootless container runtime (Podman rootless, rootless Docker, or a dedicated sandbox service such as gVisor/Firecracker) instead of mounting the host socket.
- If Docker-in-Docker is unavoidable, use a dedicated DinD sidecar with a restricted socket proxy, never the host socket.
- Add `--user 65534:65534` to the sandbox `docker run` arguments.
- Put the execution service on a separate host/VM from production data and the auth database.

---

### INJ-03 — Mass assignment lets a user overwrite another user's AI credential row

**Severity:** High
**CWE:** CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)
**Location:** `apps/backend/evaluation/src/user-ai.controller.ts:33-46`

**Evidence**

```ts
// user-ai.controller.ts:33-38
@Post()
async create(@Req() request: AuthenticatedRequest, @Body() input: { provider: string; model: string; apiKey: string; label: string; apiEndpoint?: string }) {
  if (!input.provider || !input.model || !input.apiKey || !input.label) throw new BadRequestException(...);
  const key = this.keys.create({ ...input, userId: this.userId(request), isActive: true, isValid: false });
  const saved = await this.keys.save(key);
```

```ts
// user-ai.controller.ts:41-46
@Patch(':id')
async update(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: Partial<{ provider: string; model: string; apiKey: string; label: string; apiEndpoint: string; isActive: boolean }>) {
  const key = await this.findOwned(request, id);
  Object.assign(key, input);
  ...
  const saved = await this.keys.save(key);
```

**Why it is exploitable**

The body types are TypeScript type literals, so `design:paramtypes` is `Object`. Nest's global `ValidationPipe({ whitelist: true })` (`apps/backend/evaluation/src/main.ts:62`) skips validation when the metatype is `Object`, so extra properties are **not** stripped. `Object.assign(key, input)` copies every enumerable property from the JSON body, including `id`, `userId`, `createdAt`, and `isValid`.

An authenticated user can send `PATCH /user-ai/<own-id>` with `{"id": <victim-key-id>, "apiKey": "attacker-key"}`. TypeORM's `save` uses the entity's primary key, so it updates the victim's row instead of the caller's. The same works on `POST /user-ai` by supplying an existing `id`, because `create({...input})` retains it and `save` performs an update.

**Impact**

Cross-tenant overwrite of other users' AI provider credentials (including replacing their API key, disabling their key, or changing provider/model). This is a horizontal privilege escalation / data-integrity issue. It does not directly disclose the victim's secret because `publicKey()` strips `apiKey`, but it can redirect the victim's AI usage to an attacker-controlled key/endpoint and cause billing/abuse.

**Recommendation**

- Define a real DTO class with `class-validator` decorators for create and update, and use `PartialType(CreateUserAiKeyDto)`.
- Enable `forbidNonWhitelisted: true` in the evaluation service.
- Never spread request bodies onto entities. Assign explicit fields:
  ```ts
  const { provider, model, apiKey, label, apiEndpoint, isActive } = input;
  ```
- Explicitly ignore/forbid `id`, `userId`, `createdAt`, `updatedAt` on update.

---

### INJ-04 — Mass assignment in admin package update

**Severity:** Low (admin-only)
**CWE:** CWE-915
**Location:** `apps/backend/payment/src/admin-wallet.controller.ts:31`, `apps/backend/payment/src/payment.service.ts:93`

**Evidence**

```ts
// admin-wallet.controller.ts:31
@Patch('packages/:id') async updatePackage(@Param('id') id: string, @Body() body: Partial<CreditPackageDto>) { ... }
```

```ts
// payment.service.ts:93
Object.assign(pkg, input, input.currency ? { currency: input.currency.toUpperCase() } : {});
```

**Impact**

`Partial<CreditPackageDto>` erases to `Object` at runtime, so the global `ValidationPipe` does not whitelist properties. An authenticated admin can set `id` (or other entity fields) and cause `save` to update a different package row. Impact is limited to administrators and to the `credit_packages` table, but it can corrupt pricing/credit configuration and bypass the intended target of the URL.

**Recommendation**

Use a dedicated `UpdateCreditPackageDto` class (all fields optional, no `id`), enable `forbidNonWhitelisted`, and assign fields explicitly rather than `Object.assign`.

---

## Broken Authentication Findings

### AUTH-01 — Go execution service accepts expired JWTs (no `exp`/`nbf`/`iss`/`aud` validation)

**Severity:** High
**CWE:** CWE-613 (Insufficient Session Expiration), CWE-345 (Insufficient Verification of Data Authenticity)
**Location:** `apps/backend/code-execution-go/cmd/server/main.go:254-290`

**Evidence**

```go
// main.go:254-290
type claims struct{ subject string }

func claimsFromRequest(r *http.Request, secret string) (claims, bool) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 { return claims{}, false }
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil { return claims{}, false }
	var body struct {
		Sub json.RawMessage `json:"sub"`
	}
	if json.Unmarshal(raw, &body) != nil || len(body.Sub) == 0 { return claims{}, false }
	// ... parse subject ...
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(mac.Sum(nil), sig) { return claims{}, false }
	return claims{subject: subject}, true
}
```

The function checks the HMAC signature but ignores the header (`alg`) and every registered claim. It does not enforce `alg == HS256`, so an `alg: none` token is rejected only because the signature check fails, but algorithm confusion with a public key is not a concern here since the secret is symmetric. More importantly, `exp`, `nbf`, `iat`, `iss`, and `aud` are never read.

**Impact**

Any access token that was ever issued remains valid for the execution service indefinitely, even after it expires (20 h), after the user is banned/deactivated, or after a password reset. A stolen token can be replayed forever against `POST /executions`, `GET /executions/{id}`, and `POST /executions/{id}/cancel`. Because the service also accepts the default `local-access-secret` (AUTH-02), a token can be forged outright in misconfigured deployments.

**Recommendation**

- Replace the manual parser with a maintained JWT library (e.g. `github.com/golang-jwt/jwt/v5`) and call `ParseWithClaims` with:
  - explicit `WithValidMethods([]string{"HS256"})`
  - `WithExpirationRequired()`
  - `WithIssuer(...)` / `WithAudience(...)` if the issuer sets them
  - clock skew tolerance
- Reject tokens with missing/invalid `exp`, `nbf`, `iat`, `iss`, `aud` as appropriate.
- Optionally check a revocation list or short-lived token cache, or validate against the user service.

---

### AUTH-02 — Default and weak JWT/service secrets accepted in production

**Severity:** High
**CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-521 (Weak Password Requirements)
**Location:** `apps/backend/code-execution-go/cmd/server/main.go:72`; `docker-compose.yml:82,83,123,171,172,238,298`; only `apps/backend/user/src/main.ts:18-25` validates

**Evidence**

```go
// main.go:72
jwtSecret: env("JWT_ACCESS_SECRET", "local-access-secret")
```

```yaml
# docker-compose.yml
82:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
83:      JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET:-local-refresh-secret}"
123:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
171:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
172:      SERVICE_AUTH_TOKEN: "${SERVICE_AUTH_TOKEN:-local-service-token}"
238:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
298:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
```

Only the user service enforces strength:

```ts
// apps/backend/user/src/main.ts:18-25
if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const secret = config.get<string>(key);
    if (!secret || secret.length < 32 || secret.startsWith('local-')) {
      throw new Error(`${key} must be a unique secret with at least 32 characters in production`);
    }
  }
}
```

Academic, payment, evaluation, and the Go execution service use `getOrThrow`/`env()` without any strength check.

**Impact**

If Compose is run without a populated `.env` (a common deployment mistake), every service accepts the publicly known `local-access-secret`. An attacker can forge an access token with any `sub`/`role`, authenticate to the execution service (AUTH-01 makes expiry irrelevant), call academic/payment/evaluation APIs, and — if `SERVICE_AUTH_TOKEN` defaults — impersonate an internal service to payment endpoints guarded by `ServiceAuthGuard`.

**Recommendation**

- Remove all `:-local-*` fallbacks from `docker-compose.yml`; make the variables required (`${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET is required}`).
- Apply the same length/entropy/`local-` prefix validation at startup in **every** service (academic, payment, evaluation, code-execution).
- Remove the `env("JWT_ACCESS_SECRET", "local-access-secret")` default in Go; fail fast if unset.
- Generate secrets with `openssl rand -base64 48` and store them in a secret manager, not in `.env` files.
- Use distinct secrets per trust boundary; do not share `SERVICE_AUTH_TOKEN` as a static bearer token.

---

### AUTH-03 — No login rate limiting, throttling, or account lockout

**Severity:** High
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)
**Location:** `apps/backend/user/src/auth/auth.service.ts:63-72`; `auth.controller.ts:19-25`; no `@nestjs/throttler` in any `package.json`

**Evidence**

```ts
// auth.service.ts:63-72
async login(input: LoginRequest) {
  const startedAt = performance.now();
  const user = await this.users.findOne({ where: { email: input.email.toLowerCase() } });
  if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Invalid credentials');
  if (!user.isVerified) throw new BadRequestException('User account is not verified');
  if (!(await bcrypt.compare(input.password, user.password))) throw new UnauthorizedException('Invalid credentials');
  const tokens = await this.issueTokens(user);
  ...
}
```

No attempt counter, IP/account throttle, CAPTCHA, exponential backoff, or lockout exists. `grep` across `apps/backend/*/package.json` and source found no `throttler`, `rate-limit`, or equivalent.

**Impact**

Online password guessing and credential stuffing are unrestricted. bcrypt cost 10 slows each guess but does not stop distributed or moderate-volume attacks. Because AUTH-07 leaks whether an email exists, an attacker can enumerate valid accounts and then brute-force them.

**Recommendation**

- Add `@nestjs/throttler` globally and apply stricter limits to `/auth/login`, `/auth/register`, `/auth/request-password-reset`, `/auth/verify-email`, `/auth/reset-password`, `/auth/resend-verification`, and OAuth callbacks.
- Track failed attempts per account and per IP; lock or exponentially delay after N failures.
- Add CAPTCHA/Turnstile after repeated failures.
- Log and alert on credential-stuffing patterns.

---

### AUTH-04 — OTP verification is brute-forceable and uses non-constant-time comparison

**Severity:** High
**CWE:** CWE-307, CWE-208 (Observable Timing Discrepancy)
**Location:** `apps/backend/user/src/auth/auth.service.ts:239-264`; `apps/backend/user/src/entities/user-email-otp.entity.ts:21-28`; `auth.controller.ts:58-99`

**Evidence**

```ts
// auth.service.ts:243-244
const record = await this.otps.findOne({ where: { userId: user.id, purpose: OtpPurpose.VERIFICATION } });
if (!record || record.expiresAt <= new Date() || record.otp !== input.otp) throw new BadRequestException('Invalid or expired verification code');
```

```ts
// auth.service.ts:263-264
const record = await this.otps.findOne({ where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET } });
if (!record || record.expiresAt <= new Date() || record.otp !== input.otp) throw new BadRequestException('Invalid or expired password reset code');
```

```ts
// user-email-otp.entity.ts:21-28 — no attempts column
@Column({ length: 6 }) otp!: string;
@Column({ type: 'enum', enum: OtpPurpose, default: OtpPurpose.VERIFICATION }) purpose!: OtpPurpose;
@Column({ type: 'timestamp' }) expiresAt!: Date;
```

The OTP is 6 digits (10^6 space), valid for 10 minutes, and there is no attempt counter, invalidation after N failures, or rate limit on the verify/reset endpoints. Comparison uses `!==`, which short-circuits and is not timing-safe.

**Impact**

An attacker who knows a victim's email can brute-force the 6-digit code within the 10-minute window. At typical HTTP rates this is feasible (1,000,000 requests is large but distributed attacks and missing throttling make it practical; even a few thousand attempts gives a non-trivial success probability). Successful verification/reset yields a full session (`issueTokens`) or a password change, i.e. account takeover.

**Recommendation**

- Add an `attempts` counter (and `lastAttemptAt`) to `UserEmailOtp`; invalidate the OTP after 5 failures and require a new code.
- Rate-limit per email/IP and add exponential backoff.
- Compare with `crypto.timingSafeEqual` on equal-length buffers (hash both sides first).
- Reduce OTP lifetime to 5 minutes and use at least 8 digits, or move to magic links.
- Invalidate the OTP on any successful use (already done) and on password change.

---

### AUTH-05 — Refresh tokens stored in plaintext, no rotation/reuse detection, no status re-check

**Severity:** Medium
**CWE:** CWE-522 (Insufficiently Protected Credentials), CWE-613
**Location:** `apps/backend/user/src/entities/user-refresh-token.entity.ts:16-17`; `auth.service.ts:74-85,273-280`

**Evidence**

```ts
// user-refresh-token.entity.ts:16-17
@Column({ length: 2048 })
refreshToken!: string;
```

```ts
// auth.service.ts:74-85
async refresh(refreshToken: string) {
  let payload: AuthUser;
  try { payload = await this.refreshJwt.verifyAsync<AuthUser>(refreshToken); }
  catch { throw new UnauthorizedException('Refresh token is invalid or expired'); }
  const session = await this.refreshTokens.findOne({ where: { userId: payload.sub, refreshToken }, relations: { user: true } });
  if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException(...);
  const accessToken = await this.accessJwt.signAsync({ sub: session.user.id, email: session.user.email, role: session.user.role });
  return { accessToken, refreshToken, expiresIn: ... };
}
```

```ts
// auth.service.ts:273-280
private async issueTokens(user: User) {
  const payload: AuthUser = { sub: user.id, email: user.email, role: user.role };
  const accessToken = await this.accessJwt.signAsync(payload);
  const refreshToken = await this.refreshJwt.signAsync(payload);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await this.refreshTokens.save(this.refreshTokens.create({ user, userId: user.id, refreshToken, expiresAt }));
  return { accessToken, refreshToken, expiresIn: ... };
}
```

Issues:

1. Raw refresh JWTs are stored in the database. A DB read (backup leak, SQL injection elsewhere, read replica) yields usable refresh tokens.
2. `/auth/refresh` returns the **same** refresh token and does not rotate or delete the old row, so a stolen token can be reused for its full 7-day life.
3. No reuse detection: replaying an old refresh token after rotation (if rotation is added) would not invalidate the family.
4. The user's current `status`/`isVerified`/`role` is not re-checked; a banned user can keep refreshing and receives a fresh access token with their old role.

**Impact**

Refresh-token theft (XSS, logs, backups) gives long-lived account access. Role/status changes and bans do not take effect until the refresh token expires (up to 7 days) and the access token expires (20 h).

**Recommendation**

- Store only a hash (SHA-256/HMAC) of the refresh token, never the raw JWT.
- Rotate on every refresh: issue a new token, mark the old row used/revoked, and detect reuse (revoke the whole family on replay).
- Re-load the user on refresh and reject if `status !== ACTIVE` or `isVerified` is false; re-issue the current role.
- Bind refresh tokens to a device/session id and allow per-session revocation.
- Consider `httpOnly` cookies only (already used for the browser flow) and avoid returning refresh tokens in JSON.

---

### AUTH-06 — 20-hour access tokens with no server-side revocation or status check

**Severity:** Medium
**CWE:** CWE-613
**Location:** `apps/backend/user/src/app.module.ts:51`; `apps/backend/user/src/auth/jwt-auth.guard.ts:10-20`; `apps/backend/user/src/admin/admin-user.service.ts:35-60`

**Evidence**

```ts
// app.module.ts:51
new JwtService({ secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'), signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h') as any } })
```

```ts
// jwt-auth.guard.ts:10-20
async canActivate(context: ExecutionContext) {
  const request = ...;
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new UnauthorizedException('Authentication required');
  try {
    request.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
    return true;
  } catch { throw new UnauthorizedException('Invalid access token'); }
}
```

```ts
// admin-user.service.ts:35-42
async updateStatus(userId: number, input: UpdateUserStatusRequest) {
  const user = await this.find(userId);
  user.status = input.status;
  const updated = await this.users.save(user);
  ...
}
```

`updateStatus` and `remove` (`:53-60`) change `status` but do not delete refresh tokens or maintain a token version. The guard validates only signature/expiry and trusts the embedded `role`.

**Impact**

- Deactivating/banning a user leaves their access token valid for up to 20 h, and their refresh token for up to 7 days (AUTH-05).
- Demoting an admin does not remove admin privileges until the token expires.
- Role escalation in the token is trusted by downstream services (`AdminRoleGuard`, `AdminEvaluationGuard` read `user.role` from the JWT).

**Recommendation**

- Reduce access-token lifetime to 5–15 minutes; rely on refresh rotation.
- Add a `tokenVersion`/`sessionVersion` column on `User`; include it in the JWT and verify it in the guard (or check user status) on each request.
- On status/role change, increment `tokenVersion` and delete all refresh tokens for that user.
- Optionally maintain a short-lived deny-list keyed by `jti` for immediate revocation.

---

### AUTH-07 — Account enumeration via distinct error messages

**Severity:** Medium
**CWE:** CWE-204 (Observable Response Discrepancy)
**Location:** `apps/backend/user/src/auth/auth.service.ts:42,66-68,242,294`

**Evidence**

```ts
// auth.service.ts:42 — registration
if (await this.users.findOne({ where: { email } })) throw new ConflictException('Email already registered');
```

```ts
// auth.service.ts:66-68 — login
if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Invalid credentials');
if (!user.isVerified) throw new BadRequestException('User account is not verified');
if (!(await bcrypt.compare(input.password, user.password))) throw new UnauthorizedException('Invalid credentials');
```

```ts
// auth.service.ts:242 / 294
if (user.isVerified) throw new BadRequestException('Email is already verified');
...
if (!user) throw new BadRequestException('Invalid or expired code');
```

Registration and resend-verification reveal whether an email exists; login reveals whether an account exists but is unverified; `findUserByEmail` distinguishes unknown emails. Timing also differs (bcrypt is skipped when the user is missing), enabling timing-based enumeration.

**Impact**

Attackers can build a list of valid accounts, then target them with AUTH-03/AUTH-04 brute force and phishing. This is a prerequisite for efficient credential stuffing.

**Recommendation**

- Return a generic `Invalid credentials` for unknown email, wrong password, and inactive account; always perform a dummy bcrypt comparison to equalize timing.
- For registration and password reset, return the same response whether or not the email exists (send an email only if it does).
- Do not reveal verification state before authentication.

---

### AUTH-08 — OAuth account linking by email without verifying the provider's email

**Severity:** Medium
**CWE:** CWE-287 (Improper Authentication)
**Location:** `apps/backend/user/src/auth/auth.service.ts:114-131`

**Evidence**

```ts
// auth.service.ts:114-123
const profile = await profileResponse.json() as Record<string, any>;
const normalizedProfile = normalized === 'google'
  ? { id: profile.sub, email: profile.email, firstName: profile.given_name, ... }
  : { id: String(profile.id), email: profile.email, ... };
if (!normalizedProfile.id || !normalizedProfile.email) throw new UnauthorizedException('OAuth provider returned an incomplete profile');
```

```ts
// auth.service.ts:125-131
const account = await this.oauthAccounts.findOne({ where: { provider: normalized, accountId: normalizedProfile.id }, relations: { user: true } });
let user = account?.user;
if (!user) {
  user = await this.users.findOne({ where: { email: normalizedProfile.email.toLowerCase() } }) ?? undefined;
  if (!user) user = await this.users.save(this.users.create({ ... isVerified: true ... }));
  await this.oauthAccounts.save(this.oauthAccounts.create({ provider: normalized, accountId: normalizedProfile.id, user, userId: user.id }));
}
```

The code trusts `profile.email` and links the OAuth identity to any existing local account with that email. It never checks Google's `email_verified` claim or GitHub's verified-email endpoint. For GitHub, the `/user` endpoint's `email` can be a **public** profile email that the user has not verified; the code never calls `/user/emails` to select a verified primary address. Google's `email_verified` is also ignored.

**Impact**

If a provider allows an unverified email (notably GitHub public email, or a provider account whose email is not verified), an attacker can set their provider email to a victim's address and log in as the victim, because the code links by email and then issues tokens for the existing user. This is account takeover.

**Recommendation**

- Require a verified email from the provider:
  - Google: reject unless `email_verified === true`.
  - GitHub: call `GET /user/emails` with the token and select an email with `verified: true` and `primary: true`.
- Only auto-link to an existing local account when the provider asserts a verified email; otherwise require the user to log in and link explicitly.
- Store `provider`, `accountId`, and the verified email; do not treat the provider's unverified email as authoritative.

---

### AUTH-09 — Service token compared with `!==` (not timing-safe)

**Severity:** Medium
**CWE:** CWE-208
**Location:** `apps/backend/payment/src/auth.guard.ts:5`

**Evidence**

```ts
@Injectable() export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(ctx: ExecutionContext) {
    const token = ctx.switchToHttp().getRequest().headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || token !== this.config.getOrThrow('SERVICE_AUTH_TOKEN')) throw new UnauthorizedException('Invalid service credentials');
    return true;
  }
}
```

**Impact**

String comparison short-circuits on the first differing byte, leaking a timing signal that can theoretically be used to recover the shared service token byte-by-byte. Practical exploitation over a network is noisy, but the token is long-lived and static (AUTH-02), so the fix is cheap. The same static token is shared across services and defaults to `local-service-token` in Compose.

**Recommendation**

- Compare with `crypto.timingSafeEqual` after length-checking/hashing both values.
- Replace the static shared token with short-lived service JWTs (mTLS or signed service tokens with `iss`/`aud`/`exp`) and rotate them.
- Remove the `local-service-token` default.

---

### AUTH-10 — Unauthenticated evaluation endpoints expose data

**Severity:** Medium
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**Location:** `apps/backend/evaluation/src/http.controller.ts:19,26,27`

**Evidence**

```ts
// http.controller.ts
@Get('metrics') async metrics() { const rows = await this.evaluations.list(); ... }        // :19
@Get('evaluations/:evaluationId') async get(@Param('evaluationId') id: string) { ... }        // :26
@Get('admin/status') status() { return this.evaluations.list(); }                             // :27
```

None of these routes has `@UseGuards`. `find()` returns the full `Evaluation` entity (including `userId`, `billingUserId`, `feedback`, `score`, tokens, `resourceKey`), and `list()` returns all evaluations.

**Impact**

Anyone who can reach the evaluation service can read all evaluation records (student submissions' feedback/scores, user ids, token counts) and operational metrics. `evaluationId` is a UUID, so blind enumeration is hard, but IDs are returned to clients in submission responses and may leak via logs/referrers. `admin/status` and `metrics` require no knowledge at all and leak volume/status data.

**Recommendation**

- Require authentication on `GET /evaluations/:evaluationId` and enforce ownership (`record.userId === request.user.sub`) or an admin role.
- Guard `GET /admin/status` and `GET /metrics` with an admin guard, or restrict them to an internal network/observability collector.
- Return a minimal DTO rather than the full entity.

---

### AUTH-11 — Tokens stored in `localStorage`

**Severity:** Low
**CWE:** CWE-522, CWE-79
**Location:** `apps/react-client/src/lib/Storage.ts`, `apps/react-client/src/context/AuthContext.tsx`, `apps/react-client/src/lib/AxiosInstance.ts:24-27`, `apps/admin/src/services/api.ts:16-18`, `apps/admin/src/context/authContext.tsx`

**Evidence**

```ts
// apps/admin/src/services/api.ts:16-18
function getAuthToken(): string | null {
  return localStorage.getItem('adminToken');
}
```

```ts
// apps/react-client/src/lib/AxiosInstance.ts:24-27
const token = storage.get(STORAGE_KEYS.token);
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Impact**

Any XSS in either frontend can read the access/refresh token and exfiltrate it, enabling persistent account takeover (especially with AUTH-01/AUTH-05). The backend already sets an `httpOnly` refresh cookie, but the frontends also persist tokens in `localStorage`, defeating that protection.

**Recommendation**

- Keep access tokens in memory only; rely on the `httpOnly`, `Secure`, `SameSite` refresh cookie for session continuity.
- If persistence is required, use a `httpOnly` cookie for both tokens and add CSRF protection (`SameSite=strict`/CSRF token).
- Add a strict Content-Security-Policy and sanitize all rendered user content.

---

### AUTH-12 — OTP resend has no cooldown and overwrites the active code

**Severity:** Low
**CWE:** CWE-799 (Improper Control of Interaction Frequency)
**Location:** `apps/backend/user/src/auth/auth.service.ts:282-290`

**Evidence**

```ts
private async sendOtp(user: User, purpose: OtpPurpose) {
  const otp = randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  let record = await this.otps.findOne({ where: { userId: user.id } });
  if (!record) record = this.otps.create({ user, userId: user.id, otp, purpose, expiresAt });
  else Object.assign(record, { otp, purpose, expiresAt });
  await this.otps.save(record);
  await this.mailer.sendOtp(user.email, otp, purpose);
}
```

**Impact**

`POST /auth/resend-verification` and `/auth/request-password-reset` can be called repeatedly with no cooldown, enabling email bombing and SMTP quota exhaustion. Because a single row is overwritten, an attacker who knows a victim's email can repeatedly invalidate the victim's code (denial of service). Note that `sendOtp` is also called from `register`, and it reuses one row per user regardless of purpose, so requesting a password reset replaces a pending verification code (and vice versa).

**Recommendation**

- Enforce a per-email and per-IP cooldown (e.g. 60 s) and a daily cap.
- Key OTP records by `(userId, purpose)` instead of `userId` alone so verification and reset codes do not overwrite each other.
- Invalidate old codes when issuing a new one and notify the user of resend events.

---

### AUTH-13 — bcrypt work factor 10

**Severity:** Low
**CWE:** CWE-916 (Use of Password Hash With Insufficient Computational Effort)
**Location:** `apps/backend/user/src/auth/auth.service.ts:48,129,225,265`

**Evidence**

```ts
password: await bcrypt.hash(input.password, 10),   // :48
password: await bcrypt.hash(`oauth:${normalized}:${normalizedProfile.id}:${Date.now()}`, 10), // :129
user.password = await bcrypt.hash(input.newPassword, 10); // :225, :265
```

**Impact**

Cost 10 is the bcrypt default but is below current OWASP guidance (cost 12+ as of recent recommendations, tuned to ~250 ms). Combined with no rate limiting (AUTH-03), offline cracking of a leaked hash is faster than necessary.

**Recommendation**

- Raise to cost 12 (or calibrate to ~250–500 ms on production hardware) and rehash on successful login when the stored cost is lower.
- Ensure passwords are also checked against a breached-password list (e.g. k-anonymity HIBP) and length-capped at 72 bytes for bcrypt.

---

### AUTH-14 — Logout requires a valid access token

**Severity:** Low
**CWE:** CWE-613
**Location:** `apps/backend/user/src/auth/auth.controller.ts:47-56`; `apps/backend/user/src/auth/auth.service.ts:179-182`

**Evidence**

```ts
@Post('logout')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async logout(@Req() request: ..., @Headers('x-refresh-token') headerRefreshToken?: string, ...) {
  const refreshToken = headerRefreshToken ?? request.cookies?.refresh_token;
  if (!refreshToken) return;
  await this.auth.logout(request.user.sub, refreshToken);
  ...
}
```

**Impact**

If the access token has expired but the refresh token is still valid (up to 7 days), the client cannot call `/auth/logout` and the server-side refresh row remains. A stolen refresh token stays usable even after the user tries to log out. The endpoint also silently succeeds when no refresh token is present, which hides client bugs.

**Recommendation**

- Allow logout with the refresh token alone (validate it, then delete the row), or accept an expired access token for the sole purpose of logout.
- On logout, revoke the session (and optionally all sessions) and clear the cookie.
- Return a consistent response whether or not a session existed.

---

## Verified non-findings

These areas were checked and **no vulnerability** was confirmed. They are listed to document coverage and to prevent duplicate/false-positive reports.

### SQL injection

| Path | Verdict |
|---|---|
| `apps/backend/user/src/admin/admin-user.service.ts:15-22` | Safe. `ILIKE :search` with a bound `{ search }` parameter; user input is never concatenated into SQL. |
| `apps/backend/evaluation/src/evaluation.service.ts:173-176` | Safe. `manager.query('... VALUES ($1, $2, ...)', [userId, period])` uses positional bind parameters. |
| `apps/backend/code-execution-go/internal/store/store.go:42,47,56,66` | Safe. All queries use `$1..$n` placeholders with `ExecContext`/`QueryRowContext` arguments. |
| Academic/payment migrations (`database/migrations/*.ts`) | Interpolation is limited to hard-coded table/column name arrays in migration code, not request data. |
| `apps/backend/academic/src/health.ts:20`, `user/health.controller.ts:15`, `payment/health.controller.ts:3`, `evaluation/evaluation.service.ts:156` | `SELECT 1` constants. |
| TypeORM repository calls across `academic.service.ts`, `payment.service.ts`, `admin-user.service.ts`, `notification.service.ts` | `find`/`findOne`/`save`/`delete` with object criteria or query-builder parameters; no raw dynamic SQL. |

### Command execution

| Path | Verdict |
|---|---|
| `apps/backend/payment/src/payment-proof-ocr.service.ts:61` | Safe. `spawn('tesseract', ['stdin', 'stdout', '-l', 'eng', '--psm', '6'])` uses a fixed binary and fixed argv; image bytes go to stdin. No user-controlled arguments. |
| `apps/backend/evaluation/src/logging/index.ts:164` and the same file in other services | Safe. `.exec()` is used on a fixed regex against a log message, not to run a process. |
| Frontends | No `eval`, `new Function`, `document.write`, or `dangerouslySetInnerHTML` found in reviewed source. |

### Authentication mechanics that are implemented correctly

- Password comparison uses `bcrypt.compare` (`auth.service.ts:68,223`), not manual string comparison.
- OAuth `state` is generated with `randomBytes(32)`, stored in an `httpOnly` cookie with `SameSite=lax`, 5-minute expiry, `path=/auth`, and compared with `timingSafeEqual` (`auth.controller.ts:76-78,105-107`; `auth.service.ts:170-177`).
- Refresh cookie is `httpOnly`, `secure` in production, `SameSite=strict` (`auth.controller.ts:23,102`).
- Production startup requires HTTPS `AUTH_CORS_ORIGIN` and validates JWT secret strength in the user service (`main.ts:18-25,42-51`).
- Global `ValidationPipe` is enabled in all four Nest services; user and academic use `forbidNonWhitelisted` (`user/src/main.ts:53`, `academic/src/main.ts:48`). The gap is limited to endpoints whose `@Body()` metatype is `Object` (INJ-03/INJ-04).
- Admin routes in academic (`admin.controller.ts:5`) and payment (`admin-wallet.controller.ts:25`) are guarded and check the admin role.
- Academic and payment boundary guards verify JWTs with the shared access secret (`academic/src/auth.ts:12`, `payment/src/auth.guard.ts:4`, `evaluation/src/user-ai.guard.ts:10`).
- Payment WebSocket authenticates the handshake token and validates `sub` (`payment.gateway.ts:74-89`).

### Out-of-scope observations (not scored)

- `withAuth` in `apps/backend/code-execution-go/cmd/server/main.go:291` is a no-op (`return next`). It is not currently used for routing, so it is dead code rather than a bypass; remove it to avoid future misuse.
- LLM prompt injection: user-submitted file contents are embedded in the Ollama grading prompt (`evaluation/src/ollama-evaluation.service.ts`). This can manipulate scores/feedback but is outside the requested injection categories; treat it as a separate AI-security review.
- `profilePictureUrl` is user-controlled and rendered as `<img src>` in both frontends. `javascript:` URLs do not execute in `img src`, but external URLs enable tracking/IP disclosure. Consider an allowlist/proxy if this matters.

---

## Prioritized Remediation Plan

1. **Immediate (days):** AUTH-01 (Go JWT expiry), AUTH-02 (remove default secrets), AUTH-03/AUTH-04 (login + OTP throttling and attempt limits), INJ-03 (mass assignment).
2. **Short term (1–2 weeks):** AUTH-05 (refresh hashing/rotation/status re-check), AUTH-06 (short access tokens + revocation), AUTH-08 (OAuth verified email), AUTH-10 (guard evaluation endpoints), INJ-01/INJ-02 (sandbox hardening, remove host Docker socket).
3. **Hardening (next sprint):** AUTH-07 (uniform errors), AUTH-09 (timing-safe compare + service JWT), AUTH-11 (memory-only tokens + CSP), AUTH-12/AUTH-13/AUTH-14, INJ-04.

---

*Report generated from static review. No runtime exploitation was performed, no secrets were read or reproduced, and no application code was modified.*
