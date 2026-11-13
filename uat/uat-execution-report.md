# UAT Execution Report

## Environment

- Local React Client: `http://localhost:5173`
- Local API Gateway: `http://localhost:3000`
- Local Docker Compose services: User, Academic, Payment, Evaluation, RabbitMQ, and PostgreSQL databases.
- Test data: isolated UAT classes, assignment, submission, and resource records. Credentials and tokens are intentionally omitted.

## Executed evidence

| Test Case | Actual Result | Status | Evidence |
|---|---|---|---|
| TC-04 | Class creation returned a UUID and the class opened in React. | Pass | Gateway response and React class workspace. |
| TC-05 | Student joined using a valid code and enrollment was created. | Pass | `POST /class/join/code` returned HTTP 201. |
| TC-07 | Assignment was created and published. | Pass | Assignment list displayed published assignment in React. |
| TC-09 | Student submission was stored with `SUBMITTED` status. | Pass | `POST /submissions/:id/submit` returned submission ID/status. |
| TC-10 | Teacher grade persisted as 87 with feedback; status became `GRADED`. | Pass | `POST /submissions/:id/grade` returned graded submission. |
| TC-11 | Student could retrieve their own graded submission. | Pass | Student submission endpoint returned HTTP 200. |
| TC-13 | Full external payment flow was not executed. | Blocked | Live payment/provider integration was not used. |
| TC-14 | Admin UI login and role denial were not executed in browser. | Not Tested | Separate admin browser session/account required. |
| TC-15–18 | Admin workflows were not executed in browser. | Not Tested | Admin app was inspected but not fully exercised. |
| TC-19 | Cross-application consistency was not executed. | Not Tested | Requires controlled admin and client sessions. |
| TC-20 | Backend/API behavior was observed during academic UAT; deliberate outage matrix was not run. | Not Tested | No destructive/network-fault injection performed. |

## React smoke evidence

- Dashboard displayed class cards and role information.
- Class UUID route opened successfully.
- Assignment list displayed the published assignment.
- Assignment detail displayed title, instructions, score, and published state.
- Previous UUID/number conversion defects produced `/assessments/NaN`; those conversions were removed and the client production build passed.

## Build verification

```text
React: npm run build — passed
Academic service Docker build — passed
Academic database readiness — HTTP 200
```

## Full-project execution results

| Area | Actual Result | Status | Evidence |
|---|---|---|---|
| Client public landing | Landing page, navigation, feature sections, pricing/docs links rendered. | Pass | Browser DOM snapshot at `http://localhost:5173/`. |
| Client invalid login | Invalid credentials remained on login and displayed `Invalid credentials`. | Pass | Browser DOM snapshot. |
| Client valid login | Local test account reached `/dashboard`; class cards and role labels rendered. | Pass | Browser DOM snapshot. |
| Client academic workflow | Class, assignment, submission, grading, and UUID detail flow passed. | Pass | Prior executed academic API and React evidence in this report. |
| Client wallet page | Page rendered, but displayed `Network Error`; wallet balance/packages were unavailable. | Fail | Browser DOM snapshot and API requests returned 404 for `/wallet/balance` and `/wallet/packages`. |
| Client payment page | Payment UI rendered, but provider/socket flow was not operational in local UAT. | Blocked/Fail | Browser showed network/socket errors; live payment provider was not used. |
| Client AI settings | Page rendered, but provider loading failed with `Network Error`. | Fail | Browser console showed `fetchAIProviders` failure; `/user-ai/providers` returned 404. |
| Admin local access | With temporary local API override, a normal User account could authenticate into Admin UI. | Fail | Admin route did not enforce administrator role at login boundary. |
| Admin dashboard | Dashboard rendered but all data panels displayed `Failed to fetch`. | Fail | Browser DOM snapshot; configured API endpoints did not match exposed gateway routes. |
| Admin users | Page rendered an `Administrator role required` message and no users. | Pass for denial / Fail for route guard | Non-admin account was denied by the page/API, but remained able to enter admin routes. |
| Admin packages/transactions/evaluations | Not completed with a real administrator account. | Not Tested | No administrator test account exists in the local auth database. |
| Cross-application wallet/evaluation consistency | Could not be verified because wallet and AI client endpoints failed. | Blocked | Dependent on endpoint alignment and provider/test data. |

## Full-project counts

- Client public/auth/academic checks executed: passed for the tested paths.
- Client wallet/payment/AI checks: failed or blocked.
- Admin authentication boundary: failed for non-admin route isolation.
- Admin dashboard data: failed due API/gateway contract mismatch.
- Admin management workflows: not tested with an administrator account.
- Overall: academic subsystem passes; full platform does not pass UAT.

## Execution limitations

- OAuth requires a real provider account and configured callback.
- Payment requires a provider/test integration.
- AI evaluation requires a configured provider.
- Admin workflows need a browser session with a verified administrator account.

## Current UAT cycle — 2026-11-14

### Environment

- Workspace: `/Users/nak/CADT/projects/domrov-lms-automation`
- Docker Compose stack started successfully with four PostgreSQL databases, RabbitMQ, gateway, User, Academic, Payment, and Evaluation services.
- Frontend entry points returned HTTP 200 at `http://localhost:5173/login` and `http://localhost:5174/login`.
- The temporary UAT account created for registration testing was removed after the test.
- Application source was not modified during UAT.

### Executed checks

| Test | Actual result | Status |
|---|---|---|
| Compose build/startup | All containers created; database and RabbitMQ health checks passed. | Pass |
| Gateway health | `GET /health` returned HTTP 200. | Pass |
| User readiness | Initially returned HTTP 200, but User Service crashed after registration attempted to publish an event. | Fail |
| Academic readiness | `GET /api/academic/health/ready` returned HTTP 200. | Pass |
| Payment readiness | `GET /health/ready` returned HTTP 200. | Pass |
| Evaluation readiness | `GET /health/ready` returned HTTP 200. | Pass |
| Registration | `POST /auth/register` returned HTTP 502; User Service crashed with RabbitMQ `PRECONDITION_FAILED - reply consumer cannot acknowledge`. | Fail — Critical |
| Email verification/login | Blocked by User Service crash. | Blocked |
| Wallet/package routes | `/wallet` reached authentication, but `/credit-packages` and `/wallet/packages` returned HTTP 404 through the gateway. | Fail |
| AI settings route | `/user-ai/providers` returned HTTP 404. | Fail |
| Admin dashboard route | `/admin/dashboard/stats` returned HTTP 502 without a usable admin session. | Fail/Blocked |
| Admin evaluation route | `/admin/evaluations` returned HTTP 404. | Fail |
| React Client build | `npm run build` passed. | Pass |
| React Admin build | `npm run build` passed. | Pass |
| User Service tests | 3 suites, 10 tests passed. | Pass |
| Academic Service tests | 4 suites, 13 tests passed. | Pass |
| Payment Service tests | 6 suites, 16 tests passed. | Pass |
| Evaluation Service tests | 1 suite, 2 tests passed. | Pass |

### Current UAT decision

The academic, payment, evaluation, frontend-build, and service-readiness checks pass in isolation. The complete user journey cannot be accepted because authentication fails at runtime. Wallet, AI settings, Admin, OAuth, provider-backed payment, and cross-application workflows remain blocked or failed.

## Fix verification cycle — 2026-11-14

The reported local defects were fixed and verified against the rebuilt Docker Compose stack:

| Defect | Verification | Status |
|---|---|---|
| DEF-010 | Registration returned HTTP 201; User Service remained healthy after RabbitMQ event publication. | Fixed/Verified |
| DEF-011 | `/credit-packages` and `/wallet/packages` returned HTTP 200; authenticated `/wallet` and `/wallet/transactions` returned HTTP 200. | Fixed/Verified |
| DEF-012 | Authenticated `/user-ai/providers` and `/user-ai` returned HTTP 200. | Fixed/Verified |
| DEF-013 | Temporary Admin account received HTTP 200 for dashboard stats, activity, users, income, evaluations, and AI usage logs. | Fixed/Verified |
| Admin role isolation | Admin backend routes rejected unauthenticated requests with HTTP 401; Admin UI now requires an administrator role. | Fixed/Verified |

The temporary normal-user and Admin accounts used for this verification were removed. Live OAuth, live payment-provider confirmation, and external AI-provider execution remain environment-dependent and were not marked passed.
