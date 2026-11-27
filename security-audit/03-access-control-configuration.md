# Security Audit 03 — Broken Access Control & Security Misconfiguration

| | |
|---|---|
| **Target** | DOMROV LMS (`apps/backend/*`, `apps/backend/code-execution-go`, `apps/react-client`, `apps/admin`, `docker-compose.yml`, `infra/`, `terraform/`) |
| **Date** | 2026-11-27 |
| **Scope** | (1) Broken Access Control — role checks, resource ownership, protected endpoints, authorization guards, inter-service trust; (2) Security Misconfiguration — CORS, security headers, Docker/Compose, gateway, exposed ports, database access, production settings, IaC hardening |
| **Mode** | Read-only static review. No code was modified. |
| **Out of scope** | SQL/command injection and authentication mechanics (audit 01), data exposure/XXE (audit 02), dependency CVEs, LLM prompt injection |

## Executive Summary

| ID | Severity | Category | Finding | Primary location |
|---|---|---|---|---|
| ACL-01 | **High** | Broken access control | Any authenticated user can self-enroll in any class by ID, bypassing the join-code control | `apps/backend/academic/src/controllers.ts:15`, `academic.service.ts:50-57` |
| ACL-02 | **High** | IDOR | Submission creation accepts an arbitrary `resourceId` with no ownership check, enabling cross-user file download | `academic.service.ts:141-150,328-334`, `:288-298,423` |
| ACL-03 | **High** | Resource takeover | `notify-upload`/`presigned-url` trust client-supplied storage keys and `persistStoredResource` reassigns `ownerId` | `academic.service.ts:240-268,307-313` |
| ACL-04 | **High** | Privilege persistence | Admin authorization trusts the JWT `role` claim with no DB/status check; demoted or banned admins keep access until token expiry | `apps/backend/user/src/admin/admin-role.guard.ts:5-14`, `auth/jwt-auth.guard.ts:10-20` |
| ACL-05 | **High** | Vertical escalation | A regular Admin can ban/deactivate SuperAdmins and other Admins; only role changes are SuperAdmin-only | `apps/backend/user/src/admin/admin-user.controller.ts:22-25`, `admin-user.service.ts:35-42` |
| ACL-06 | **Medium** | Missing authorization | Evaluation `metrics`, `admin/status`, and `evaluations/:id` are unauthenticated and return cross-user records | `apps/backend/evaluation/src/http.controller.ts:19,26,27` |
| ACL-07 | **Medium** | Inter-service auth | Service-to-service credit operations use one static bearer token, no rotation, audience, or mTLS | `apps/backend/payment/src/auth.guard.ts:5`, `controllers.ts:29,31` |
| ACL-08 | **High** | Messaging authorization | RabbitMQ consumers trust any producer; forged credit/evaluation commands are accepted as authoritative | `apps/backend/payment/src/messaging/rabbitmq.ts:29-42`, `apps/backend/evaluation/src/rabbit.controller.ts:15-22` |
| CFG-01 | **High** | Default secrets / prod config | Compose ships default JWT, service, DB, broker, and Grafana credentials; `NODE_ENV` defaults to `development` so production checks and `Secure` cookies are skipped | `docker-compose.yml:77,80-83,121-123,168-172,235-238,295-301,337-338,364,386,408,430,452,538`; `user/src/main.ts:18-25,42-51` |
| CFG-02 | **High** | Network exposure | Every backend service, the gateway, and RabbitMQ AMQP/management publish on `0.0.0.0`, bypassing the gateway; broker management is reachable with default credentials | `docker-compose.yml:28,71,114,159,226,286,332-334` |
| CFG-03 | **Medium** | Missing security headers | No `helmet` in any Nest service and no CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy on gateway, client, or admin hosting; gateway is HTTP-only | `infra/gateway/nginx.conf.template:74-86`, `apps/react-client/nginx.conf:1-15`, `apps/admin/netlify.toml:1-4` |
| CFG-04 | **Medium** | CORS | Payment WebSocket reflects any origin with credentials; academic service has no production CORS validation and silently falls back to localhost | `payment/src/payment.gateway.ts:17`, `academic/src/main.ts:47` |
| CFG-05 | **High** | IaC exposure | Terraform SSH ingress defaults to `0.0.0.0/0` | `terraform/variables.tf:55-58`, `terraform/modules/security/main.tf:5-10`, `terraform/terraform.tfvars.example:6` |
| CFG-06 | **Medium** | IaC hardening | IMDSv2 is optional, the ALB uses a 2016 TLS policy, and the production DB disables final snapshots with 1-day backups | `terraform/modules/compute/main.tf:29-34`, `modules/load_balancer/main.tf:47`, `modules/database/main.tf:90-96` |
| CFG-07 | **Medium** | Container/deploy hardening | Code-execution runs as root with the host Docker socket; evaluation image runs as root; mutable `:latest` images are deployed | `docker-compose.yml:309`, `apps/backend/code-execution-go/Dockerfile:8-12`, `apps/backend/evaluation/Dockerfile:8-14`, `terraform/user_data.sh:104-105` |

**Authorization is enforced on the backend.** All academic, payment, user, and evaluation business routes are guarded by a JWT boundary guard; the ownership helpers in the academic and payment services were verified and are effective for the paths noted below. The findings above are specific bypasses or missing checks, not a claim that authorization is frontend-only.

**Cross-references.** AUTH-02 (default secrets), AUTH-05/06 (token lifetime, no status re-check), AUTH-09 (non-constant-time service token), and AUTH-10 (unauthenticated evaluation endpoints) from `01-injection-authentication.md` overlap with ACL-04, ACL-06, ACL-07, and CFG-01. They are referenced rather than re-scored.

---

## Authorization Model (verified)

| Service | Guard | What it validates | Notes |
|---|---|---|---|
| user | `JwtAuthGuard` | Bearer signature + `JWT_ACCESS_SECRET` | No DB lookup of user status/role (`apps/backend/user/src/auth/jwt-auth.guard.ts:10-20`) |
| academic | `JwtBoundaryGuard` | Bearer signature + `JWT_ACCESS_SECRET` | Applied at controller class level (`controllers.ts:9,19,26,34,42,54,68,83,100`; `admin.controller.ts:5`) |
| payment | `JwtBoundaryGuard` | Bearer signature + `JWT_ACCESS_SECRET` | Applied per route (`controllers.ts:9-24`); admin controller applies it at class level |
| payment | `ServiceAuthGuard` | Static shared `SERVICE_AUTH_TOKEN` | Used for refund/reserve/commit/release (`controllers.ts:29,31`) |
| payment | `AdminRoleGuard` | `role` claim ∈ `admin`, `superadmin` | Claim-only (`auth.guard.ts:7-14`) |
| user | `AdminRoleGuard` / `SuperAdminRoleGuard` | `role` claim ∈ `Admin`/`SuperAdmin` | Claim-only (`admin-role.guard.ts:5-23`) |
| evaluation | `UserAiJwtGuard` | Bearer signature + `JWT_ACCESS_SECRET` | Only on quota/admin/AI routes |
| evaluation | `AdminEvaluationGuard` | `role` claim ∈ admin set | Claim-only, composed after `UserAiJwtGuard` (`http.controller.ts:5-12,29-40`) |

Ownership logic that was verified as correct:

- Payment user data is always scoped by the JWT `sub`: wallet, transactions, payments, status, delete, and proof verification all include `userId` in the query (`payment.service.ts:28-62,195-205`).
- Notifications are scoped by `userId` on list, unread, and mark-as-read (`notification.service.ts:44-62`).
- Academic grading, assignment management, roster/tracking, and team management require instructor/owner or team-leader privileges (`academic.service.ts:120-136,181-193,416-421`).
- Submission reads by ID use `findOneBy({ id, userId })` (`academic.service.ts:410-414`); teacher review additionally calls `requireInstructor` (`:194`).
- Evaluation admin list and AI usage logs are guarded (`http.controller.ts:29-40`).
- Academic and payment admin controllers are guarded and check a role (`admin.controller.ts:5,52-55`; `admin-wallet.controller.ts:24-25`).

The frontend `ProtectedRoute` components (`apps/admin/src/components/layout/ProtectedRoute.tsx`, `apps/react-client/src/components/ProtectedRoute.tsx`) are UX controls only. They were not treated as an authorization boundary; every finding below was confirmed against the backend.

---

## Broken Access Control Findings

### ACL-01 — Any authenticated user can enroll in any class by ID, bypassing the join code

**Severity:** High
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-862 (Missing Authorization)
**Location:** `apps/backend/academic/src/controllers.ts:15`; `apps/backend/academic/src/academic.service.ts:50-57`

**Evidence**

```ts
// controllers.ts:15 — authenticated, but no join code or invitation is required
@Post(':classId/enrollments') enroll(@Param('classId') classId: string, @Req() req: AuthenticatedRequest) {
  return this.academic.enroll(classId, req.user.sub);
}
```

```ts
// academic.service.ts:50-57
async enroll(classId: string, userId: string) {
  if (!await this.classes.findOneBy({ id: classId })) throw new NotFoundException('Class not found');
  const existing = await this.enrollments.findOneBy({ classId, userId });
  if (existing) throw new ConflictException('User is already enrolled');
  const enrollment = await this.enrollments.save(this.enrollments.create({ classId, userId, role: 'student', status: 'active' }));
  logger.info('academic.enrollment.created', 'Class enrollment created');
  return enrollment;
}
```

The legitimate join flow (`POST /class/join/code` → `joinClass`, `academic.service.ts:104-110`) validates a 6-hex-character `joinCode`. The `enrollments` route skips that control entirely and enrolls the caller as an active student.

**Impact**

Any authenticated user who knows or obtains a class UUID gains persistent membership. Membership unlocks `listStudents`, `listTeams`, `getTeam`, `listAssignments`, `getAssignment`, team join, and submission creation (`academic.service.ts:112-122,141-144`). Class IDs are returned to every member in `classView` (`:425`) and appear in URLs and shared links, so a single leaked ID exposes the class roster and all class material to any account. It also defeats any future "invite-only"/paid-class semantics.

**Recommendation**

- Require the join code (or a server-side invitation record) on the enrollment route, or remove the route and keep `POST /class/join/code` as the only self-service path.
- Check the class `status` and any enrollment policy before creating the row.
- Prefer opaque invitation tokens with expiry and single use over short class join codes.
- Rate-limit join attempts per user/IP (see AUTH-03).

---

### ACL-02 — Submission `resourceId` is not ownership-checked, enabling cross-user file download (IDOR)

**Severity:** High
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-284 (Improper Access Control)
**Location:** `apps/backend/academic/src/academic.service.ts:141-150`, `:328-334`; authorization sink at `:288-298`, `:423`; routes at `controllers.ts:31,89,111,120`

**Evidence**

```ts
// academic.service.ts:328-334 — only existence is checked
async createSubmission(assignmentId: string, input: CreateSubmissionDto, userId: string) {
  const assignment = await this.assignments.findOneBy({ id: assignmentId });
  if (!assignment) throw new NotFoundException('Assignment not found');
  const enrollment = await this.enrollments.findOneBy({ classId: assignment.classId, userId, status: 'active' });
  if (!enrollment) throw new ForbiddenException('Not enrolled in class');
  if (!input.resourceId || !await this.resources.findOneBy({ id: input.resourceId })) throw new NotFoundException('Resource not found');
  const submission = await this.submissions.save(this.submissions.create({ assignmentId, resourceId: input.resourceId, ... userId, status: 'stored' }));
  ...
}
```

```ts
// academic.service.ts:141-150 — the legacy submit/draft path does not check the resource at all
await this.requireMember(assignment.classId, userId);
...
submission = this.submissions.create({ assignmentId, userId, resourceId: input.resourceId ?? undefined as any, ... });
```

```ts
// academic.service.ts:288-298 — download is authorized by submission ownership
async getSubmissionResource(submissionId: string, userId: string) {
  const submission = await this.getSubmissionForUser(submissionId, userId); // checks submission.userId === caller
  const resource = await this.resources.findOneBy({ id: submission.resourceId });
  if (!resource) throw new NotFoundException('Resource not found');
  return resource;
}
```

`CreateSubmissionDto.resourceId` is an arbitrary client-supplied UUID (`dto.ts:13`). The service never compares `resource.ownerId` with `userId`.

**Exploit chain (confirmed by code path)**

1. The attacker creates their own class and assignment (any authenticated user can create a class — `academic.service.ts:33-40`) and enrolls in it (ACL-01).
2. The attacker submits a `resourceId` belonging to another user.
3. `getSubmissionForUser` (`:194`) sees that the *submission* belongs to the attacker, so it authorizes the read.
4. `GET /file/submission/:submissionId/download` (`controllers.ts:120-128`) streams the victim's file.
5. The attacker now also satisfies `requireMemberByResource` (`:423`), which grants access to `GET /file/download/:resourceId` for the same resource.

**Impact**

Cross-tenant read of any stored file whose UUID is known (documents, source archives, images). Resource UUIDs are exposed to instructors and appear in assignment/submission responses, so a student in a shared class can read another student's submission even if the instructor-only download path is otherwise protected.

**Recommendation**

- At submission time, require `resource.ownerId === userId` (or that the resource is explicitly shared with the caller's class/team), and return 403 otherwise.
- Bind a submission to the resource by ownership, not merely by storing the UUID; do not authorize arbitrary resource reads from a submission row.
- Remove the unused `resourceId` fallback in `saveSubmission` or apply the same ownership check there.
- Add a regression test: user A creates a resource, user B submits its ID, then B's download must return 403.

---

### ACL-03 — Client-controlled storage keys allow resource takeover and overwrite

**Severity:** High (resource takeover; arbitrary object write when `STORAGE_PROVIDER=r2`)
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-732 (Incorrect Permission Assignment)
**Location:** `apps/backend/academic/src/academic.service.ts:240-268`, `:307-313`; `apps/backend/academic/src/storage.ts:150-153`; routes at `controllers.ts:110-111`

**Evidence**

```ts
// academic.service.ts:252-268
async createResource(input: NotifyUploadDto, ownerId: string) {
  if (/^https?:\/\//i.test(input.key)) { ... }
  if (!this.storage || !(await this.storage.exists(input.key))) throw new NotFoundException('File not found in storage');
  const metadata = await this.storage.head(input.key);
  return this.persistStoredResource({ key: input.key, filename: input.filename, ... }, ownerId);
}

private async persistStoredResource(input: { key: string; ... }, ownerId: string) {
  let resource = await this.resources.findOneBy({ url: input.key });
  const data = { title: input.filename, url: input.key, ownerId, ... };
  if (resource) Object.assign(resource, data); // ownerId is overwritten
  else resource = this.resources.create(data);
  return this.resources.save(resource);
}
```

```ts
// academic.service.ts:307-313 — the caller chooses the key
async presignedResource(input: NotifyUploadDto, userId: string) {
  ...
  const key = input.key || `${userId}/${input.resourceType ?? 'resource'}/${input.resourceId ?? 'pending'}/${filename}`;
  return { presignedUrl: await this.storage.createUploadUrl(key, input.contentType), key, ... };
}
```

```ts
// storage.ts:150-153 — R2 presigns a PUT for exactly the supplied key
async createUploadUrl(key: string, contentType: string) {
  this.ensureConfigured();
  return getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
}
```

Generated keys are predictable: `${userId}/${resourceType}/${resourceId}/${filename}` (`:245`, `:310`).

**Impact**

- **Ownership hijack (all storage providers):** `POST /file/notify-upload` with an existing victim key reassigns that resource row's `ownerId` to the attacker. The attacker then owns the file record and can read it through `GET /file/download/:resourceId`.
- **Arbitrary object write (`STORAGE_PROVIDER=r2`):** `GET /file/presigned-url?key=<victim key>` returns a signed `PUT` URL for any key the attacker names, allowing them to overwrite another user's uploaded file (content substitution, malware hosting, or destroying evidence).
- **Cross-namespace writes:** a user can upload into another user's prefix by supplying that prefix in `key`, because the key is not re-derived server-side.

**Recommendation**

- Never accept `key` from the client. Derive the object key server-side from the authenticated user and an unguessable random ID (e.g. `users/{userId}/{uuid}/{safeFilename}`), and return it to the client.
- On `createResource`, verify `resource.ownerId === ownerId` before returning or updating an existing row; otherwise reject with 403.
- For presigned uploads, issue the URL only for a server-generated key and record a pending-upload row that binds the key to the caller.
- Optionally scope R2 credentials to a prefix per user, or use per-user buckets.

---

### ACL-04 — Admin authorization trusts the JWT claim; demoted or banned admins keep privileges

**Severity:** High
**CWE:** CWE-863 (Incorrect Authorization), CWE-613 (Insufficient Session Expiration)
**Location:** `apps/backend/user/src/admin/admin-role.guard.ts:5-23`; `apps/backend/user/src/auth/jwt-auth.guard.ts:10-20`; `apps/backend/academic/src/admin.controller.ts:52-55`; `apps/backend/payment/src/auth.guard.ts:7-14`; `apps/backend/evaluation/src/http.controller.ts:5-12`

**Evidence**

```ts
// user/src/admin/admin-role.guard.ts:5-14
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: { role?: SystemRole } }>();
    if (!request.user) throw new UnauthorizedException('Authentication required');
    if (![SystemRole.SUPER_ADMIN, SystemRole.ADMIN].includes(request.user.role as SystemRole)) {
      throw new ForbiddenException('Administrator role required');
    }
    return true;
  }
}
```

```ts
// user/src/auth/jwt-auth.guard.ts:15 — only signature/expiry are verified
request.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
```

`AdminRoleGuard` never loads the user from the database, so `role` and `status` come exclusively from the token. The academic (`admin.controller.ts:52-55`), payment (`auth.guard.ts:7-14`), and evaluation (`http.controller.ts:5-12`) admin checks have the same property. Access tokens live 20 hours (`user/src/app.module.ts:51`).

**Impact**

- A user demoted from `Admin`/`SuperAdmin` to `User` retains admin access to user management, wallets, academic dashboards, and evaluation data until the token expires (up to 20 hours).
- A user set to `BANNED`/`INACTIVE` can continue using any still-valid access token; no guard re-checks status (see AUTH-05/06).
- Combined with CFG-01 (default/weak JWT secret), this becomes full admin impersonation.

**Recommendation**

- Resolve the user from the database in the guard (or a shared auth middleware) and check `status === ACTIVE` plus the current `role` on every privileged request.
- Shorten access-token lifetime to 10–15 minutes and add a token version/`jti` revocation list checked server-side.
- Keep role checks centralized (one guard per service) instead of string comparisons in each controller.
- Invalidate sessions on role change, ban, and password change.

---

### ACL-05 — A regular Admin can ban/deactivate SuperAdmins and other Admins

**Severity:** High
**CWE:** CWE-269 (Improper Privilege Management), CWE-863 (Incorrect Authorization)
**Location:** `apps/backend/user/src/admin/admin-user.controller.ts:22-25`; `apps/backend/user/src/admin/admin-user.service.ts:35-42`

**Evidence**

```ts
// admin-user.controller.ts:7-37
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminRoleGuard) // Admin OR SuperAdmin
export class AdminUserController {
  ...
  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateUserStatusRequest) {
    return { success: true, data: await this.adminUsers.updateStatus(id, input) };
  }

  @Patch(':id/role')
  @UseGuards(SuperAdminRoleGuard) // SuperAdmin only
  async updateRole(...) { ... }

  @Delete(':id')
  @UseGuards(SuperAdminRoleGuard) // SuperAdmin only
  async deactivate(...) { ... }
}
```

```ts
// admin-user.service.ts:35-42 — no target-role or self checks
async updateStatus(userId: number, input: UpdateUserStatusRequest) {
  const user = await this.find(userId);
  user.status = input.status;
  const updated = await this.users.save(user);
  ...
}
```

`UpdateUserStatusRequest.status` is one of `ACTIVE`/`INACTIVE`/`BANNED` (entity enum, `user.entity.ts:3-7`). There is no restriction on the target's role and no self-protection.

**Impact**

A compromised or malicious Admin can set every SuperAdmin (and every other Admin) to `BANNED` or `INACTIVE`. Since only a SuperAdmin can change roles or reactivate accounts via `DELETE`/`PATCH :id/role`, the organization can be left with no usable SuperAdmin — a persistent denial of administration. An Admin can also ban arbitrary users, including instructors mid-term.

**Recommendation**

- Require `SuperAdmin` to modify any account whose current role is `Admin` or `SuperAdmin` (both status and role changes).
- Forbid self-modification (status/role/delete) and protect the last active SuperAdmin.
- Enforce a role hierarchy in the service layer, not only at the route level, so future endpoints cannot bypass it.
- Audit-log the actor, target, old value, and new value.

---

### ACL-06 — Evaluation metrics, admin status, and individual evaluations are unauthenticated

**Severity:** Medium
**CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
**Location:** `apps/backend/evaluation/src/http.controller.ts:19,26,27`

**Evidence**

```ts
// http.controller.ts
@Get('metrics') async metrics() { const rows = await this.evaluations.list(); ... } // line 19
@Get('evaluations/:evaluationId') async get(@Param('evaluationId') id: string) { const record = await this.evaluations.find(id); ... } // line 26
@Get('admin/status') status() { return this.evaluations.list(); } // line 27
```

For comparison, the adjacent admin routes are correctly guarded:

```ts
@Get('admin/evaluations')
@UseGuards(UserAiJwtGuard, AdminEvaluationGuard) // lines 29-30
```

**Impact**

- `GET /metrics` and `GET /admin/status` disclose aggregate and per-record evaluation data to anyone who can reach the service (and the service is published on `0.0.0.0:3004`, CFG-02).
- `GET /evaluations/:evaluationId` returns the full record (user ID, language, status, feedback, token counts, provider/model) for any ID. IDs are UUIDs, but they appear in responses and logs; an unauthenticated caller who obtains one can read another user's evaluation.
- This overlaps AUTH-10; it is repeated here because the correct fix is an authorization guard, not only authentication.

**Recommendation**

- Add `UserAiJwtGuard` + `AdminEvaluationGuard` to `/metrics` and `/admin/status`.
- For `/evaluations/:id`, require authentication and authorize by `record.userId === sub`, or by instructor/admin role for the owning class.
- Prefer not to publish the evaluation service port at all (CFG-02).

---

### ACL-07 — Static shared service token protects credit operations

**Severity:** Medium
**CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-522 (Insufficiently Protected Credentials)
**Location:** `apps/backend/payment/src/auth.guard.ts:5`; `apps/backend/payment/src/controllers.ts:29,31`

**Evidence**

```ts
// payment/src/auth.guard.ts:5
@Injectable() export class ServiceAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const token = ctx.switchToHttp().getRequest().headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || token !== this.config.getOrThrow('SERVICE_AUTH_TOKEN')) throw new UnauthorizedException('Invalid service credentials');
    return true;
  }
}
```

```ts
// payment/src/controllers.ts:29,31
@Post('wallet/refund') @UseGuards(ServiceAuthGuard) refund(...) { ... }
@Controller('credits/reservations') ... @Post() @UseGuards(ServiceAuthGuard) reserve(...) { ... }
```

**Impact**

A single long-lived bearer token authorizes refunds, reservations, commits, and releases for any `userId`. It is shared by every caller, has no audience/scope, no expiry, and is not bound to a workload identity. If it leaks (logs, env dump, SSRF, compromised service), the holder can mint or refund credits arbitrarily. Compose also supplies a default value (CFG-01), and the comparison is not timing-safe (AUTH-09).

**Recommendation**

- Replace the static token with short-lived signed service JWTs (`iss`/`aud`/`exp`, per-caller scope) or mTLS/workload identity.
- Compare secrets with `crypto.timingSafeEqual` if a shared secret is retained.
- Restrict refund/reserve/commit/release to the specific internal callers that need them and log the caller identity.
- Remove the default value so the service fails closed when unset.

---

### ACL-08 — RabbitMQ consumers accept commands from any producer

**Severity:** High
**CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-345 (Insufficient Verification of Data Authenticity)
**Location:** `apps/backend/payment/src/messaging/rabbitmq.ts:29-42`; `apps/backend/evaluation/src/rabbit.controller.ts:15-22`; `apps/backend/code-execution-go/internal/messaging/rabbitmq.go:105-130`

**Evidence**

```ts
// payment/src/messaging/rabbitmq.ts:29-42
@MessagePattern('credit.reserve')
async reserve(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
  return this.handleRequest('credit.reserve', envelope, context,
    () => this.payments.reserve(envelope.payload as ..., envelope.idempotencyKey));
}
@MessagePattern('credit.commit') ...
@MessagePattern('credit.release') ...
```

```ts
// evaluation/src/rabbit.controller.ts:15-22
@EventPattern('evaluation.requested')
async requested(@Payload() message: ..., @Ctx() context: RmqContext) {
  await this.consume('evaluation.requested', message, context, true, (payload) => this.evaluations.request(payload));
}
```

The handlers validate shape/idempotency but not the producer. Any client that can publish to the exchange can supply `payload.userId`, `amount`, `reservationId`, or a full evaluation request.

**Impact**

With broker access (CFG-02: AMQP `5672` and management `15672` published with default credentials), an attacker can:

- publish `credit.reserve`/`credit.commit` to create or settle credit reservations for arbitrary users;
- publish `evaluation.requested` to enqueue grading jobs, consuming LLM/quota resources and writing attacker-controlled evaluation records;
- publish `code.execution.requested` to drive the execution worker.

This is a direct financial-integrity and resource-abuse path, independent of the HTTP API.

**Recommendation**

- Do not expose the broker outside the private network; use per-service RabbitMQ users with least-privilege permissions (see CFG-02).
- Sign messages (HMAC or JWS) or use mTLS + RabbitMQ auth, and verify the producer identity in each consumer.
- Reject commands whose `producer` is not an expected service and whose payload does not match the authenticated caller's context.
- Keep idempotency keys server-issued, not client-supplied.

---

## Security Misconfiguration Findings

### CFG-01 — Default credentials and `development` mode are the Compose defaults

**Severity:** High
**CWE:** CWE-1188 (Insecure Default Initialization), CWE-798 (Use of Hard-coded Credentials), CWE-614 (Sensitive Cookie Without `Secure` Attribute)
**Location:** `docker-compose.yml:77,80-83,121-123,168-172,235-238,295-301,337-338,364,386,408,430,452,538`; `apps/backend/user/src/main.ts:18-25,42-51`; `apps/backend/user/src/auth/auth.controller.ts:23,62,102`

**Evidence**

```yaml
# docker-compose.yml
77:      NODE_ENV: "${NODE_ENV:-development}"
80:      DATABASE_URL: "postgresql://domrov:domrov@auth-db:5432/auth_db"
82:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
83:      JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET:-local-refresh-secret}"
...
171:      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-local-access-secret}"
172:      SERVICE_AUTH_TOKEN: "${SERVICE_AUTH_TOKEN:-local-service-token}"
...
337:      RABBITMQ_DEFAULT_USER: "${RABBITMQ_DEFAULT_USER:-domrov}"
338:      RABBITMQ_DEFAULT_PASS: "${RABBITMQ_DEFAULT_PASS:-domrov}"
364:      POSTGRES_PASSWORD: "${AUTH_DB_PASSWORD:-domrov}"
...
538:      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-domrov-local}
```

```ts
// user/src/main.ts:18-25 — only runs in production
if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const secret = config.get<string>(key);
    if (!secret || secret.length < 32 || secret.startsWith('local-')) throw new Error(...);
  }
}
```

```ts
// auth.controller.ts:23
response.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', ... });
```

**Impact**

- Compose overrides the Dockerfile's `ENV NODE_ENV=production` with `development` unless the operator sets `NODE_ENV` explicitly. In that state:
  - the user service skips its JWT-strength check and accepts the `local-*` defaults;
  - refresh cookies are issued without `Secure` and travel over HTTP (the gateway is HTTP-only, CFG-03);
  - `AUTH_CORS_ORIGIN` falls back to `true` (reflect any origin) in the user service (`main.ts:42`).
- All four services share the same access secret and the same database/broker credentials. Anyone who learns one default can forge tokens for every service and read every database.
- The Grafana admin password and the postgres-exporter config (`observability/postgres-exporter/config.yml:5-7`) also use the default database credential.

**Recommendation**

- Remove all `:-default` fallbacks for secrets; use `${VAR:?required}` or an env file that must be supplied.
- Set `NODE_ENV: production` explicitly in the production Compose file and fail startup if it is not `production`.
- Generate independent, high-entropy secrets per service and per database; load them from a secret manager (SSM/Secrets Manager) rather than a shared env file.
- Mark the refresh cookie `Secure` unconditionally in production and enforce HTTPS at the edge.
- Rotate any secret that may have been deployed with these defaults.

---

### CFG-02 — Backend services and RabbitMQ publish on all interfaces, bypassing the gateway

**Severity:** High
**CWE:** CWE-284 (Improper Access Control), CWE-1327 (Binding to an Unrestricted IP Address), CWE-306 (Missing Authentication)
**Location:** `docker-compose.yml:28,71,114,159,226,286,332-334`

**Evidence**

```yaml
# docker-compose.yml
28:      - "${GATEWAY_PORT:-8088}:80"       # gateway, HTTP only
71:      - "3001:3001"                       # user
114:      - "3002:3002"                      # academic
159:      - "3003:3003"                      # payment
226:      - "3004:3004"                      # evaluation
286:      - "3005:3005"                      # code-execution
332:      - "${RABBITMQ_PORT:-5672}:5672"    # AMQP
334:      - "${RABBITMQ_MANAGEMENT_PORT:-15672}:15672"  # management UI
```

No host IP is specified, so Docker binds `0.0.0.0`. The gateway is the only intended entry point (`infra/gateway/nginx.conf.template`), but every upstream is directly reachable on its own port.

**Impact**

- The gateway's routing and CORS policy are bypassed; clients can call `:3001`–`:3005` directly.
- RabbitMQ management (`15672`) is exposed with default credentials (CFG-01) — a well-known takeover path that also enables ACL-08.
- The code-execution service (`:3005`) is reachable directly, and it runs with the host Docker socket (CFG-07 / INJ-02).
- Health/metrics endpoints (including unguarded evaluation routes, ACL-06) are reachable without the gateway.

**Recommendation**

- Publish only the gateway: bind it to `127.0.0.1:8088` or place it behind the ALB, and remove `ports` for all backend services (use the Compose network).
- If host access is needed for debugging, bind to `127.0.0.1:<port>:<port>` explicitly.
- Remove the RabbitMQ management port from production, or bind it to localhost and require TLS + non-default credentials.
- Add network policies / firewall rules so only the gateway can reach the service ports.

---

### CFG-03 — No security headers, and the gateway serves plain HTTP

**Severity:** Medium
**CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers), CWE-319 (Cleartext Transmission)
**Location:** `infra/gateway/nginx.conf.template:74-86`; `apps/react-client/nginx.conf:1-15`; `apps/admin/netlify.toml:1-4`; all four `apps/backend/*/src/main.ts` (no `helmet`)

**Evidence**

```nginx
# infra/gateway/nginx.conf.template:74-86
server {
  listen 80;
  ...
  add_header Access-Control-Allow-Origin $cors_origin always;
  add_header Access-Control-Allow-Credentials "true" always;
  add_header Access-Control-Allow-Methods "GET, POST, PATCH, PUT, DELETE, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Authorization, Content-Type, Idempotency-Key, X-Requested-With" always;
  if ($request_method = OPTIONS) { return 204; }
```

```nginx
# apps/react-client/nginx.conf — no add_header at all
server { listen 80; ... }
```

`grep` for `helmet` across `apps/backend/*/package.json` and `src` returned no matches. The admin SPA's `netlify.toml` contains only an SPA redirect.

**Impact**

- No `Content-Security-Policy`: any XSS (including via uploaded/rendered content) can exfiltrate the `localStorage` tokens used by both frontends (AUTH-11).
- No `X-Frame-Options`/`frame-ancestors`: the app can be framed for clickjacking (e.g. admin actions, payment confirmation).
- No `X-Content-Type-Options: nosniff`: MIME confusion on user-uploaded files served by the API.
- No `Referrer-Policy`: URLs (which contain class/assignment IDs) leak to third parties.
- The gateway listens on `80` only; TLS is terminated at the ALB in the Terraform path, but the Compose deployment exposes plain HTTP on `8088`. Without HSTS, users can be downgraded.

**Recommendation**

- Add `helmet` to each Nest service with a strict CSP, `frameguard`, `noSniff`, `referrerPolicy`, and HSTS in production.
- Add the equivalent headers in `infra/gateway/nginx.conf.template`, `apps/react-client/nginx.conf`, and `apps/admin` hosting (Netlify `headers` block or equivalent).
- Serve the gateway over TLS (or bind it to localhost and require the TLS-terminating proxy) and redirect HTTP → HTTPS.
- Keep `X-Forwarded-Proto` handling consistent so cookies and redirects use HTTPS.

---

### CFG-04 — CORS: permissive WebSocket origin and unvalidated academic fallback

**Severity:** Medium
**CWE:** CWE-942 (Permissive Cross-domain Policy), CWE-1188 (Insecure Default Initialization)
**Location:** `apps/backend/payment/src/payment.gateway.ts:17`; `apps/backend/academic/src/main.ts:47`; `apps/backend/user/src/main.ts:42-52`

**Evidence**

```ts
// payment/src/payment.gateway.ts:17
@WebSocketGateway({ cors: { origin: true, credentials: true } })
```

```ts
// academic/src/main.ts:47 — no production validation
app.enableCors({ origin: process.env.AUTH_CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
```

```ts
// user/src/main.ts:42
const corsOrigin = config.get<string>('AUTH_CORS_ORIGIN') ?? (process.env.NODE_ENV === 'production' ? undefined : true);
```

**Impact**

- The Socket.IO gateway reflects any `Origin` with credentials. The socket still requires a bearer token in `handshake.auth.token` (`payment.gateway.ts:74-95`), so this is not directly exploitable without token theft, but it removes a defense-in-depth boundary and permits any site to open sockets and observe connection behavior.
- The academic service does not enforce `AUTH_CORS_ORIGIN` in production and silently falls back to `http://localhost:5173`. A misconfigured deployment either breaks the real frontend or, if an operator sets a broad value, widens access; there is no HTTPS/format validation like the user service has.
- The user service is correct in production (requires an HTTPS origin), but in development it reflects any origin with credentials — acceptable only because `NODE_ENV` is expected to be non-production (see CFG-01).

**Recommendation**

- Set the WebSocket `cors.origin` to the same allowlist as the HTTP API (or `false` if the socket is same-origin only).
- Reuse the user service's production validation (required, HTTPS, no path) in the academic and payment services.
- Centralize CORS configuration so all services behave identically.
- Keep credentials only where cookies are actually needed; the API uses bearer tokens, so `credentials: true` is largely unnecessary.

---

### CFG-05 — Terraform allows SSH from anywhere by default

**Severity:** High
**CWE:** CWE-284 (Improper Access Control), CWE-1327 (Binding to an Unrestricted IP Address)
**Location:** `terraform/variables.tf:55-58`; `terraform/modules/security/main.tf:5-10`; `terraform/terraform.tfvars.example:6`

**Evidence**

```hcl
# terraform/variables.tf:55-58
variable "ssh_cidr" {
  type        = string
  description = "SSH source CIDR"
  default     = "0.0.0.0/0"
}
```

```hcl
# terraform/modules/security/main.tf:5-10
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = [var.ssh_cidr]
}
```

```hcl
# terraform/terraform.tfvars.example:6
ssh_cidr                = "0.0.0.0/0"
```

**Impact**

Port 22 is open to the entire internet on the application instances. This exposes SSH to credential stuffing, key leakage, and unpatched OpenSSH vulnerabilities, and removes the ability to restrict administrative access to a bastion/VPN. The example tfvars reinforces the insecure default.

**Recommendation**

- Default `ssh_cidr` to a private range or require it explicitly; remove the `0.0.0.0/0` example.
- Prefer AWS Systems Manager Session Manager (the instance role already has `ssm:GetParameter`; add `ssm:StartSession`) and remove the public SSH ingress entirely.
- If SSH is required, restrict to a bastion/VPN CIDR and enable MFA at the access layer.

---

### CFG-06 — IMDSv2 optional, weak ALB TLS policy, and minimal database recovery settings

**Severity:** Medium
**CWE:** CWE-1188 (Insecure Default Initialization), CWE-326 (Inadequate Encryption Strength), CWE-693 (Protection Mechanism Failure)
**Location:** `terraform/modules/compute/main.tf:29-34`; `terraform/modules/load_balancer/main.tf:47`; `terraform/modules/database/main.tf:90-96`

**Evidence**

```hcl
# modules/compute/main.tf:29-34
metadata_options {
  http_endpoint               = "enabled"
  http_tokens                 = "optional"   # IMDSv1 still allowed
  http_put_response_hop_limit = 1
  instance_metadata_tags      = "enabled"
}
```

```hcl
# modules/load_balancer/main.tf:47
ssl_policy = "ELBSecurityPolicy-2016-08"
```

```hcl
# modules/database/main.tf:90-96
skip_final_snapshot     = true
publicly_accessible     = false
backup_retention_period = 1
storage_encrypted       = true
```

**Impact**

- IMDSv1 remains available. Any SSRF in an application on the instance can read the instance role credentials from `169.254.169.254` without a token.
- `ELBSecurityPolicy-2016-08` permits older TLS versions/ciphers that are no longer recommended.
- `skip_final_snapshot = true` and a 1-day backup window mean accidental deletion or destructive changes are unrecoverable beyond 24 hours.

**Recommendation**

- Set `http_tokens = "required"` (IMDSv2 only) and consider `http_endpoint = "disabled"` where metadata is not needed.
- Use a current policy such as `ELBSecurityPolicy-TLS13-1-2-2021-06` (or newer).
- Set `skip_final_snapshot = false`, enable deletion protection, and raise `backup_retention_period` to at least 7–14 days for production.
- Consider Multi-AZ (already enabled in the example) and automated cross-region backups if RPO requires it.

---

### CFG-07 — Container and deployment hardening gaps

**Severity:** Medium
**CWE:** CWE-250 (Execution with Unnecessary Privileges), CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**Location:** `docker-compose.yml:309`; `apps/backend/code-execution-go/Dockerfile:8-12`; `apps/backend/evaluation/Dockerfile:8-14`; `terraform/user_data.sh:104-105,129`; `docker-compose.yml:468,476,512,525,533`

**Evidence**

```yaml
# docker-compose.yml:308-310
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - "${CODE_EXECUTION_WORKSPACE_DIR:-/tmp/domrov-execution}:/tmp/domrov-execution"
```

```dockerfile
# apps/backend/code-execution-go/Dockerfile:8-12
FROM docker:27-cli
WORKDIR /app
COPY --from=build /out/code-execution /app/code-execution
USER root
EXPOSE 3005
```

```dockerfile
# apps/backend/evaluation/Dockerfile:8-14 — no USER directive
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
...
CMD ["node", "dist/main.js"]
```

```bash
# terraform/user_data.sh:104-105
APP_IMAGE="phyvathanak/nestjs-backend:latest"
CODE_EVAL_IMAGE="phyvathanak/code_eval:latest"
```

**Impact**

- The code-execution service has effective root on the host through the Docker socket (detailed in INJ-02). Its container also runs as root.
- The evaluation image runs as root, so a compromise of the Node process has more room to move.
- Mutable `:latest` tags make deployments non-reproducible and allow a compromised registry/tag to silently replace production code.
- Several observability images use `latest`, increasing supply-chain drift.
- `user_data.sh` deploys the legacy monolith (`nestjs-backend:latest`) rather than the Compose stack, so the reviewed service isolation may not match what is actually running in the Terraform environment.

**Recommendation**

- Remove the Docker socket from the code-execution service; use a rootless/remote runner or a dedicated orchestration API with least privilege.
- Add `USER node` (or a non-root UID) to the evaluation and code-execution images and set `--user` on spawned sandboxes.
- Pin all images by digest (`@sha256:...`), not `:latest`, including observability.
- Reconcile `terraform/user_data.sh` with the Compose deployment so the deployed topology matches the reviewed one.

---

## Verified Non-Findings (Access Control)

These areas were checked and no confirmed vulnerability is reported, to document coverage and prevent false positives.

| Area | Verdict |
|---|---|
| Payment user wallet/payments/status/delete/proof | Correctly scoped by JWT `sub` (`payment.service.ts:28-62,195-205`). A user cannot read or mutate another user's payment. |
| Notification list/unread/mark-read | Scoped by `userId` (`notification.service.ts:44-62`). |
| Academic grading, feedback, assignment create/update/publish/delete | Require instructor/owner (`academic.service.ts:120-136,181-193,416-421`). |
| Academic team join/leave/remove/delete | Require class membership, team leader, or instructor as appropriate (`academic.service.ts:112-117`). |
| Academic submission read by ID | `findOneBy({ id, userId })` (`academic.service.ts:410-414`); teacher access re-checks instructor role (`:194`). |
| Evaluation admin list and AI usage logs | Guarded by `UserAiJwtGuard` + `AdminEvaluationGuard` (`http.controller.ts:29-40`). |
| Payment admin wallet/packages/transactions | Class-level `JwtBoundaryGuard` + `AdminRoleGuard` (`admin-wallet.controller.ts:24-25`). |
| Academic admin dashboard/evaluations | Guarded and role-checked (`admin.controller.ts:5,52-55`). |
| JWT signature verification | Performed in every guard (`user/auth/jwt-auth.guard.ts:15`, `academic/src/auth.ts:17`, `payment/src/auth.guard.ts:4`, `evaluation/src/user-ai.guard.ts:18`). Expiry gaps are covered by AUTH-01/06. |
| Payment WebSocket authentication | Handshake token is verified and `sub` is required (`payment.gateway.ts:74-95`). |
| Payment/evaluation HTTP CORS | No `enableCors` call, so the default same-origin policy applies (safe by default); the WebSocket override is CFG-04. |
| Frontend route guards | `ProtectedRoute` is client-side only. It is not a security boundary and was not counted as a finding; backend enforcement is authoritative. |

**Observations, not scored**

- `listStudents` lets any enrolled student enumerate the class roster (`academic.service.ts:112`; route `controllers.ts:51`). This may be intentional for collaboration; if rosters are sensitive, restrict it to instructors.
- `getAssignment` returns all resources owned by the caller rather than resources attached to the assignment (`academic.service.ts:122`). This is a data-selection quirk, not an access-control bypass.
- The gateway sets `error_log /dev/null` (`infra/gateway/nginx.conf.template:80`) to avoid logging sensitive URLs. This is a deliberate trade-off; retain the structured access log and use a redacted error log for operations.
- `AcademicAdminController.requireAdmin` and the payment/evaluation admin guards each maintain their own string list of admin roles (`admin.controller.ts:53-54`, `auth.guard.ts:10-11`, `http.controller.ts:9`). They currently agree, but the duplication risks drift; centralize the role model.

---

## Cross-Reference to Audit 01

| Audit 01 | Relationship to this report |
|---|---|
| AUTH-02 — default/weak JWT and service secrets | Root cause and amplifier for CFG-01, ACL-04, ACL-07. |
| AUTH-05 — refresh tokens in plaintext, no rotation/status re-check | Same missing status re-check as ACL-04; relevant to banned-admin persistence. |
| AUTH-06 — 20-hour tokens, no revocation | Directly determines the window for ACL-04 and ACL-05. |
| AUTH-09 — non-constant-time service token comparison | Same guard as ACL-07. |
| AUTH-10 — unauthenticated evaluation endpoints | Same endpoints as ACL-06; this report adds the authorization fix. |
| INJ-02 — Docker socket in code-execution | Same configuration as CFG-07; severity and exploitability are covered there. |
| INJ-04 — mass assignment in admin package update | Adjacent to ACL-05 (admin-only mutation paths); fix together. |

---

## Prioritized Remediation Plan

1. **Immediate (days)**
   - Remove default secrets and force `NODE_ENV=production` (CFG-01).
   - Stop publishing backend/broker ports; expose only the gateway (CFG-02).
   - Add ownership checks to submission `resourceId` and reject arbitrary storage keys (ACL-02, ACL-03).
   - Require join code/invitation for enrollment (ACL-01).
   - Restrict SSH ingress (CFG-05).

2. **Short term (1–2 weeks)**
   - Load the user from the DB in admin guards and check status/role (ACL-04).
   - Enforce a SuperAdmin hierarchy for status changes (ACL-05).
   - Guard `/metrics`, `/admin/status`, and `/evaluations/:id` (ACL-06).
   - Authenticate RabbitMQ producers and lock down broker permissions (ACL-08).
   - Replace the static service token with scoped, short-lived credentials (ACL-07).

3. **Hardening (next sprint)**
   - Add `helmet`/CSP/HSTS and equivalent headers on gateway, client, and admin hosting (CFG-03).
   - Tighten WebSocket CORS and academic production CORS validation (CFG-04).
   - Require IMDSv2, update the TLS policy, and enable DB deletion protection/backups (CFG-06).
   - Remove the Docker socket, run all containers as non-root, and pin images by digest (CFG-07).
   - Centralize role definitions and add authorization regression tests for every ownership boundary.

---

## Methodology and Limitations

- Static review of controllers, guards, services, entities, DTOs, Compose, gateway/frontend nginx, Netlify config, Dockerfiles, and Terraform.
- Every finding cites the exact file and line range and was traced from route to data access. No runtime exploitation was performed.
- No secret values are reproduced; only variable names and the fact that defaults exist are reported.
- Dynamic behavior (database contents, actual deployed environment variables, cloud security-group state) was not observed. Severity assumes the Compose defaults are used unless a deployment overrides them.
- Frontend-only controls were deliberately excluded from scoring; all scored issues are backend or infrastructure controls.

---

*Report generated from static review. No application code was modified and no secrets were read or reproduced.*
