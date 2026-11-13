# Defect Report

## DEF-001 — Academic UUID converted to NaN in React

- Application: React Client
- Feature: Assignment details/submission/grading
- Severity: High
- Reproducibility: Reproduced before the fix
- Steps: Open an assignment whose backend ID is a UUID; navigate to detail or submission actions.
- Expected: Requests use the UUID assignment ID.
- Actual: React called `/assessments/NaN`; duplicate `NaN` React keys appeared.
- Cause: Numeric conversion of UUID route parameters in client code.
- Resolution status: Fixed; UUID conversions were removed and React production build passed.

## DEF-002 — Assignment schema was missing workflow columns

- Application: Academic backend supporting both frontends
- Feature: Assignment creation/publishing
- Severity: Critical
- Reproducibility: Reproduced during UAT
- Expected: Assignment draft and publish operations succeed.
- Actual: Database rejected missing `start_at` and related columns.
- Resolution status: Fixed with assignment workflow migration; rerun passed.

## DEF-003 — Student submission view rejected the owner

- Application: Academic backend/client
- Feature: Student grade visibility
- Severity: High
- Reproducibility: Reproduced during UAT
- Expected: Student can view their own submission.
- Actual: Numeric JWT subject and string database user ID were compared strictly, causing instructor authorization logic.
- Resolution status: Fixed by normalizing user IDs; rerun returned HTTP 200.

## DEF-004 — Admin route/API coverage remains unclear

- Application: React Admin
- Feature: Admin workflows
- Severity: Medium
- Reproducibility: Not fully executed
- Observation: Admin route configuration contains `/user`, while detail uses `/users/:userId`; API base URL behavior depends on `.env`.
- Classification: Verification gap/inconsistency, not confirmed production defect.

## Environment or evidence gaps

- Live OAuth, payment, and AI-provider flows were not fully executed.
- Admin browser acceptance requires a separate authenticated administrator session.

## DEF-010 — User Service crashes during registration RabbitMQ interaction

- Application: User Service / RabbitMQ
- Feature: Registration and authentication
- Severity: Critical
- Reproducibility: Reproduced in the current UAT cycle
- Steps: Start the Compose stack and submit `POST /auth/register` with valid isolated test data.
- Expected: Registration completes or returns a controlled application error; User Service remains available.
- Actual: Gateway returned HTTP 502 and User Service exited.
- Evidence: Container log reported `PRECONDITION_FAILED - reply consumer cannot acknowledge` while creating a RabbitMQ reply consumer.
- Impact: Login, email verification, all authenticated client workflows, Admin workflows, wallet balance, AI settings, and cross-application testing are blocked.
- Resolution status: Needs Fix.

## DEF-011 — Current gateway does not expose package routes used by the client

- Application: React Client / Payment Service / Gateway
- Feature: Wallet and credit package loading
- Severity: High
- Reproducibility: Reproduced in the current UAT cycle
- Expected: Credit packages load through the frontend API origin.
- Actual: `GET /credit-packages` and `GET /wallet/packages` returned HTTP 404 through the gateway. `GET /wallet` reached the protected Payment Service route.
- Resolution status: Needs Fix.

## DEF-012 — AI settings API is not exposed

- Application: React Client / Evaluation Service / Gateway
- Feature: AI provider settings
- Severity: High
- Reproducibility: Reproduced in the current UAT cycle
- Expected: `/user-ai/providers` is available for the authenticated client.
- Actual: `GET /user-ai/providers` returned HTTP 404.
- Resolution status: Needs Fix.

## DEF-013 — Admin routes are incomplete or unavailable through the gateway

- Application: React Admin / backend / gateway
- Feature: Dashboard and evaluation administration
- Severity: High
- Reproducibility: Reproduced or blocked in the current UAT cycle
- Expected: Admin dashboard and evaluation routes are available to an administrator.
- Actual: `/admin/dashboard/stats` returned HTTP 502 without a usable authenticated session, and `/admin/evaluations` returned HTTP 404. No valid administrator session could be established because User Service crashed during registration.
- Resolution status: Needs Fix / Blocked for full acceptance.

## DEF-005 — Admin environment points to production API by default

- Application: React Admin
- Feature: Admin authentication/local UAT
- Severity: High
- Reproducibility: Reproduced
- Expected: Local Admin UAT uses the local gateway.
- Actual: `apps/admin/.env` points to `https://api.domrov.app`; local login initially returned `Failed to fetch`.
- Evidence: Local UAT succeeded only when the dev server was started with a temporary `VITE_API_URL=http://localhost:3000` override.
- Classification: Environment/configuration defect.

## DEF-006 — Admin accepts a normal user at the UI boundary

- Application: React Admin
- Feature: Admin authorization
- Severity: High
- Reproducibility: Reproduced
- Steps: Open Admin login and authenticate with a normal User account.
- Expected: Account is rejected or redirected before entering Admin dashboard.
- Actual: Account reached `/dashboard`; protected data panels failed and the Users page later displayed `Administrator role required`.
- Recommendation: enforce administrator role immediately after profile load and protect every admin route.

## DEF-007 — Client wallet routes do not match Payment Service routes

- Application: React Client / Payment Service / Gateway
- Feature: Wallet and package loading
- Severity: High
- Reproducibility: Reproduced
- Expected: Wallet page loads balance and packages.
- Actual: Client requested `/wallet/balance` and `/wallet/packages`; gateway returned 404. Payment Service exposes different route names (`/wallet`, `/credit-packages`).
- Impact: Credit page displays `Network Error`.

## DEF-008 — Client AI settings routes are not exposed by the current services

- Application: React Client / Evaluation Service / Gateway
- Feature: AI provider/key settings
- Severity: High
- Reproducibility: Reproduced
- Expected: AI providers and saved configurations load.
- Actual: Client requested `/user-ai/providers`; gateway returned 404. Current Evaluation Service source exposes health, metrics, evaluation lookup, and admin status routes, not the client `/user-ai` routes.

## DEF-009 — Admin dashboard endpoint contract is incomplete

- Application: React Admin / Gateway / backend
- Feature: Admin dashboard statistics and activity
- Severity: High
- Reproducibility: Reproduced
- Expected: Admin dashboard cards/charts/activity load.
- Actual: UI panels displayed `Failed to fetch`; frontend calls `/admin/dashboard/stats` and `/admin/dashboard/recent-activity`, while the current academic admin controller exposes `/admin/dashboard`.

## Resolution verification — 2026-11-14

- DEF-010: Fixed by configuring RabbitMQ publisher clients with `noAck: true`; registration and service health were re-tested successfully.
- DEF-011: Fixed with gateway/client-compatible wallet aliases, user transaction retrieval, and string user-ID database migration; authenticated wallet checks returned HTTP 200.
- DEF-012: Fixed by adding the Evaluation Service `/user-ai` authenticated controller and gateway route; provider/key list checks returned HTTP 200.
- DEF-013: Fixed by adding Admin dashboard/evaluation route adapters, normalizing Admin role checks, and enforcing Admin UI role protection; temporary Admin verification returned HTTP 200 on the required routes.

Provider-dependent testing remains open and is not considered a defect resolution failure: OAuth, live payment confirmation, and external AI-provider execution need sandbox credentials/configuration.
