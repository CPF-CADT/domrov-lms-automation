# Task 10 — Local Integration Testing Report

**Project:** DOMROV LMS Automation
**Branch:** `feat/local-infrastructure`
**Date:** 2026-11-16
**Status:** Infrastructure verified; full E2E acceptance pending

## 1. Objective

Verify the Student and Admin frontends, Nginx gateway,
microservices, PostgreSQL databases, RabbitMQ, and
the Evaluation and Code Execution infrastructure.

## 2. Verified Results

| Component | Result | Evidence |
|---|---|---|
| Docker Compose | PASS | 12 services/containers started |
| Nginx gateway | PASS | /health returned HTTP 200 |
| Student frontend | PASS | Build and initial page rendering |
| Admin frontend | PASS | Build and initial page rendering |
| Academic Service | PASS | Health and database readiness |
| Payment Service | PASS | Health and database readiness |
| Credit packages | PASS | HTTP 200 with empty array |
| Evaluation Service | PASS | Health and database readiness |
| Code Execution | PASS | Health and database readiness |
| RabbitMQ | PASS | Broker ping and 6 active consumers |
| Evaluation unit tests | PASS | 2 tests |
| Academic RabbitMQ tests | PASS | 2 tests |
| Go worker tests | PASS | 1 test |

Note: Health checks and unit tests do not establish
successful end-to-end message processing.

## 3. Resolved Integration Issues

### Payment database migration

**Problem:** GET /credit-packages returned HTTP 500.

**Cause:** AddCreditPackageDescription migration existed
but was missing from TypeORM registration and local
database migration history.

**Local resolution:**
- Registered the missing migration in the data source.
- Created a database backup.
- Reconciled the missing nullable description column
  and its migration record in the local database.
- Verified all three migration records.
- Confirmed GET /credit-packages returned HTTP 200.
- Added local backups to .gitignore.

**Commit:** 46a98f4

**Deployment follow-up:** Rebuild and version the Payment
image using the corrected data-source configuration.
Validate migration behavior on a fresh database.

## 4. Open Issues and Handoff

### AUTH-01 — QA account provisioning
Priority: P0
Owner: Auth backend

The local environment lacks usable authorized Student
and Admin QA credentials. SMTP is not configured,
and the local Auth source differs from the running
image's OTP implementation.

Acceptance criteria:
- Provide a development-only account provisioning flow.
- Create verified Student and authorized Admin accounts.
- Never hardcode or expose passwords.
- Refuse provisioning in production.
- Document the exact commands and test credentials workflow.

### EVAL-01 — Evaluation request contract mismatch
Priority: P1
Owner: Academic and Evaluation backend

Academic publishes resourceId while Evaluation expects
resourceKey. The inspected code shows no explicit mapping.

Acceptance criteria:
- Agree on a shared message contract.
- Validate the payload at the consumer boundary.
- Add tests for valid and invalid payloads.
- Verify a complete evaluation-request flow.

### EVAL-02 — Mock evaluation runner
Priority: P1
Owner: Evaluation backend

Evaluation currently uses MockRunnerService.
Supported languages receive a deterministic score
rather than an actual code-based evaluation.

Acceptance criteria:
- Integrate the intended grading implementation.
- Return actual score and feedback.
- Add success and failure integration tests.
- Clearly separate mock and real evaluation modes.

### EXEC-01 — Execution result delivery reliability
Priority: P1
Owner: Code Execution backend

The Go worker currently ignores errors from
SaveResult and Publish before acknowledging the message.

Acceptance criteria:
- Handle persistence and publishing failures.
- Prevent silent loss of execution results.
- Implement appropriate retry and idempotency behavior.
- Add tests for failure and redelivery scenarios.

### DEVOPS-01 — Payment image reproducibility
Priority: P1
Owner: DevOps and Payment backend

The running Payment image was built with an outdated
migration registration.

Acceptance criteria:
- Build a corrected versioned image.
- Verify migration discovery.
- Test startup against a fresh local database.
- Document deployment and migration commands.

## 5. Pending End-to-End Testing

- Student login, profile retrieval, logout, refresh.
- Admin login and role-based access.
- Class listing and assignment workflows.
- Submission and evaluation workflows.
- Wallet balance and credit package UI.
- Payment-related API authorization.
- RabbitMQ processing and failure recovery.
- Go execution result persistence and publication.
- Browser navigation, assets, and console errors.

No real payments should be initiated.

## 6. Final Assessment

Local infrastructure verification: PASSED.

Existing automated tests executed: 5 PASSED.

Authenticated frontend and full submission-to-evaluation
end-to-end acceptance: NOT YET VERIFIED.

Task 10 remains open until blockers are resolved
and the pending workflows are tested.

## 7. Payment Image Reproducibility Verification

**Date:** 2026-11-16
**Status:** Fresh-database migration test passed

### Image

- Local image: `domrov-payment-service:task10-local`
- Built from the corrected Payment source.
- All three migrations confirmed in the compiled image.

### Fresh Database Test

An isolated PostgreSQL 16 container was created
on a temporary Docker network.

The corrected Payment image successfully executed:

1. InitialPaymentSchema1764000000000
2. AddCreditPackageDescription1764000001000
3. UseStringUserIds1764000002000

### Verified Results

- Migration transaction committed successfully.
- All three migrations appeared in database history.
- `credit_packages.description` exists as nullable text.
- Existing Payment infrastructure was not replaced.
- Git working tree remained clean.

The additional automated SQL assertion was not executed
because the Docker command did not attach standard input.
The schema and migration history were verified directly.

### Remaining Deployment Work

- Publish an appropriately versioned Payment image.
- Verify deployment using the corrected image.
- Confirm repeat startup against an existing migrated database.
- Avoid using the mutable `dev` image tag for release tracking.

**Assessment:** Fresh-database migration compatibility verified.
Full replacement deployment and image publication remain pending.
