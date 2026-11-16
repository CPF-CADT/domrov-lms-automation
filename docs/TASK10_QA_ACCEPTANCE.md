# Task 10 — QA Acceptance Checklist

**Project:** DOMROV LMS Automation
**Environment:** Local Docker Compose
**Branch:** `feat/local-infrastructure`
**Status:** Pending authenticated E2E acceptance

## Status Definitions

- PASS: Tested successfully with evidence.
- FAIL: Tested and produced incorrect behavior.
- BLOCKED: Prerequisite unavailable.
- NOT RUN: Test has not been executed.

## 1. Infrastructure

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| INF-01 | Nginx gateway health | HTTP 200 | PASS |
| INF-02 | Academic readiness | Database connected | PASS |
| INF-03 | Payment readiness | Database connected | PASS |
| INF-04 | Evaluation readiness | Database connected | PASS |
| INF-05 | Code Execution readiness | Database connected | PASS |
| INF-06 | RabbitMQ connectivity | Broker reachable | PASS |
| INF-07 | Credit package endpoint | HTTP 200 | PASS |

## 2. Student Authentication

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| AUTH-01 | Valid login | Access granted | BLOCKED |
| AUTH-02 | Invalid login | HTTP 401 | PASS |
| AUTH-03 | Profile retrieval | Correct user returned | BLOCKED |
| AUTH-04 | Session persistence | Session restored | BLOCKED |
| AUTH-05 | Token refresh | Session refreshed | BLOCKED |
| AUTH-06 | Logout | Session invalidated | BLOCKED |

## 3. Admin Authentication

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| ADM-01 | Admin login | Access granted | BLOCKED |
| ADM-02 | Student accesses admin page | Access denied | BLOCKED |
| ADM-03 | Admin dashboard | Loads without API errors | BLOCKED |
| ADM-04 | Admin logout | Session invalidated | BLOCKED |

## 4. Academic Workflows

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| ACA-01 | My classes | Authorized classes returned | BLOCKED |
| ACA-02 | Class details | Correct class displayed | BLOCKED |
| ACA-03 | Assignments | Available assignments returned | BLOCKED |
| ACA-04 | Submission | Submission stored successfully | BLOCKED |
| ACA-05 | Unauthorized request | HTTP 401 | PASS |
| ACA-06 | Evaluation result | Submission result updated | NOT RUN |

## 5. Payment Workflows

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| PAY-01 | Credit packages | Valid JSON response | PASS |
| PAY-02 | Wallet balance | Authorized wallet returned | BLOCKED |
| PAY-03 | Credit reservation | Correct reservation flow | NOT RUN |
| PAY-04 | Credit commit/release | Correct transaction state | NOT RUN |
| PAY-05 | Socket.IO connection | Connection established | PASS |
| PAY-06 | Payment notification | Correct event received | NOT RUN |

No real payments are permitted during QA.

## 6. Evaluation and Code Execution

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| EVAL-01 | Evaluation tests | 2 tests pass | PASS |
| EVAL-02 | Academic RabbitMQ tests | 2 tests pass | PASS |
| EXEC-01 | Go worker tests | 1 test passes | PASS |
| EVAL-03 | Evaluation job processing | Result persisted and published | NOT RUN |
| EVAL-04 | Evaluation contract | Consistent resource identifier | NOT RUN |
| EXEC-02 | Code execution result | Execution result persisted | NOT RUN |
| EXEC-03 | Worker publish failure | No silent message loss | NOT RUN |
| EXEC-04 | Execution isolation | Sandbox limits enforced | NOT RUN |

## 7. Browser Verification

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| WEB-01 | Student page loading | Page renders | PASS |
| WEB-02 | Admin page loading | Page renders | PASS |
| WEB-03 | Navigation and broken assets | No failures | NOT RUN |
| WEB-04 | Browser console | No critical errors | NOT RUN |
| WEB-05 | API integration | Correct gateway requests | NOT RUN |

## 8. Open Blockers

- AUTH-01: Development-only QA account provisioning.
- EVAL-01: Evaluation request contract alignment.
- EVAL-02: Real evaluation implementation.
- EXEC-01: Reliable result persistence and publication.
- DEVOPS-01: Versioned Payment image rebuild and fresh deployment verification.

## 9. Acceptance Criteria

Task 10 may close only when:

1. Required authenticated Student and Admin scenarios pass.
2. Core Academic and Payment workflows pass.
3. Evaluation and Code Execution integration is verified.
4. Critical defects are resolved or formally accepted.
5. Test evidence is recorded.
6. No real payments are initiated.

Related report: `docs/TASK10_INTEGRATION_REPORT.md`.
