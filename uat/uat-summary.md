# UAT Summary

## Executive summary

The source analysis identified two frontend applications:

- React Client: 20 feature groups covering authentication, dashboard, classes, assignments, submissions, grading, files, AI settings, billing, and profile.
- React Admin: 9 feature groups covering authentication, dashboard, users, wallet, packages, transactions, and evaluations.

The executed academic flow passed after resolving UUID, database-schema, route, and user-ID normalization defects.

## Counts

These counts represent the documented UAT set, not a claim that every case was executed:

- Discovered feature groups: 29
- UAT scenarios: 28
- Detailed test cases: 20
- Executed and passed: 6 core academic cases plus build/readiness checks
- Failed after fixes: 0 in the rerun academic flow
- Blocked: payment/provider-dependent coverage
- Not tested: most Admin browser workflows, OAuth provider completion, live AI, deliberate outage tests, and cross-application consistency

## Application results

### React Client

Academic client flow is functioning for the executed path: dashboard → class → assignment → submission → grading/grade view. UUID-based routing now works.

### React Admin

Source analysis is complete, but browser acceptance evidence is insufficient. Admin functionality should not be marked accepted until login, user management, wallet, transactions, and evaluations are executed with an administrator account.

### Cross-application workflows

Not accepted yet. Admin changes affecting client state require controlled two-session testing.

## Readiness decision

**Not ready for stakeholder acceptance.**

### Current UAT cycle result — 2026-11-14

The current workspace was tested with Docker Compose. Infrastructure readiness, isolated backend unit tests, and both frontend production builds passed. The complete UAT failed at the authentication boundary: User Service crashes during registration because of a RabbitMQ reply-consumer acknowledgement error. Consequently, authenticated academic, wallet, AI, Admin, OAuth, payment-provider, and cross-application workflows cannot be accepted in this cycle.

Current defects requiring a fix phase:

1. User Service RabbitMQ reply-consumer crash during registration.
2. Gateway/package route mismatch for wallet credit packages.
3. Missing `/user-ai` API exposure.
4. Incomplete/unavailable Admin dashboard and evaluation routes.

Current cycle classification:

- Service/build regression checks: **Pass**
- Academic core end-to-end flow: **Blocked by authentication runtime failure**
- Wallet/payment: **Fail/Blocked**
- AI settings/evaluation: **Fail/Blocked**
- Admin: **Fail/Blocked/Not Tested with administrator credentials**
- Cross-application consistency: **Not Tested**

The academic workflow has execution evidence, but full-project UAT found blocking client/admin/payment/AI integration defects. The platform still requires endpoint alignment, strict Admin authorization, and a real administrator session before acceptance.

## Fix verification cycle — 2026-11-14

The local defects identified in the previous cycle were fixed and verified:

- RabbitMQ authentication event publishing no longer crashes User Service.
- Registration returns HTTP 201 and the service remains healthy.
- Wallet balance, transaction history, and credit-package routes are available.
- Evaluation Service exposes authenticated `/user-ai` provider/key routes.
- Admin dashboard, user, evaluation, and AI-usage routes are available through the gateway.
- Admin UI now checks the authenticated user role before rendering protected pages.
- Payment user ownership now supports the auth service string user IDs through a migration.

Local regression status: **Pass for fixed service contracts and Compose startup.**

Overall stakeholder acceptance remains pending because live OAuth, payment-provider confirmation, and external AI-provider execution require configured test integrations and were not executed as local tests.

## Recommendations

1. Execute TC-14 through TC-19 with a non-production administrator account.
2. Verify and document the intended Admin `/user` versus `/users/:userId` route behavior.
3. Run payment and AI tests using sandbox/provider test credentials.
4. Add automated regression tests for UUID routing and the academic lifecycle.
5. Capture screenshots and request/response logs as stakeholder evidence.
6. Align wallet, payment, AI, and Admin frontend routes with the gateway and service controllers.
