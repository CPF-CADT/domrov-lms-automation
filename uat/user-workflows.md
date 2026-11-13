# DOMROV User Workflows

## W-01: Normal user authentication

- Role: user/student/teacher
- Entry: `/login`
- Preconditions: valid test account; API gateway available.
- Flow: enter email/password → submit → receive access token → fetch profile → redirect to dashboard.
- APIs: `POST /auth/login`, `GET /users/me`.
- Expected outcome: authenticated dashboard with user profile.

## W-02: Google authentication

- Role: public user
- Entry: Google button on `/login`.
- Preconditions: OAuth credentials and callback URL configured.
- Flow: click Google → provider login → callback → token refresh → dashboard.
- APIs: `/auth/google/login`, `/auth/google/callback`, `/auth/refresh-token`.

## W-03: Teacher creates an academic class

- Role: teacher-capable authenticated user
- Entry: dashboard → Create Class.
- Flow: enter name/description → submit → class appears in dashboard → open class workspace.
- APIs: `POST /class`, `GET /class/my-classes`.

## W-04: Student joins a class

- Role: student
- Entry: dashboard → Join Class.
- Preconditions: valid join code.
- Flow: enter code → submit → class list refreshes → student opens class.
- APIs: `POST /class/join/code`, `GET /class/my-classes`.

## W-05: Assignment lifecycle

- Role: teacher
- Entry: class Assignments tab.
- Flow: create draft → fill title/instructions/score/due date → upload resources/rubrics → publish → assignment appears as published.
- APIs: `/assessments/class/:classId/draft`, `PATCH /assessments/:id`, `PATCH /assessments/:id/publish`.

## W-06: Student submission and grading

- Roles: student then teacher
- Entry: assignment details.
- Flow: student views assignment → uploads resource → saves draft → submits → teacher opens grading view → reviews submission → enters score/feedback.
- APIs: `/file/*`, `/submissions/:assessmentId/submit`, `/submissions/:id/grade`, `/submissions/:id/student`.

## W-07: Academic analytics

- Role: authorized administrator/teacher, depending on endpoint policy
- Entry: admin dashboard or grading view.
- Flow: view assignment tracking/statistics or academic dashboard.
- APIs: `/admin/dashboard`, assignment tracking/roster/stats endpoints.

## W-08: Admin user and wallet management

- Role: administrator/staff
- Entry: Admin dashboard → Users.
- Flow: search/filter user → open detail/action modal → change status or add/deduct credits → verify table and user-facing balance.
- APIs: admin user, wallet, and transaction endpoints in `apps/admin/src/services`.

## W-09: Client AI evaluation settings

- Role: authenticated user
- Entry: `/ai-evaluation`.
- Flow: view providers → add/update/delete user key → trigger or inspect evaluation-related state.
- APIs: `/user-ai/*`, `/evaluations/*`.

## W-10: Credit purchase

- Role: authenticated user
- Entry: `/creditPurchase`.
- Flow: choose package or payment option → submit payment/QR flow → observe pending/success/error state → verify wallet balance.
- APIs: wallet and payment service endpoints.
