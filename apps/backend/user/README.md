# User Service

This is the first independently buildable service extracted from the original
NestJS backend. It owns `auth_db` and the identity data required for login and
session management.

## Implemented boundary

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout` (Bearer token plus `X-Refresh-Token`)
- `POST /auth/verify-email`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /users/me`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

The implementation keeps the existing password validation, JWT payload fields,
refresh-session persistence, email verification, and password-reset behavior.

OAuth strategies, admin user management, wallet/payment aggregation, and the
legacy `/users/details` response are deliberately not extracted in this pass.
They depend on other bounded contexts or provider configuration and are tracked
for a later Auth Service task rather than being coupled into `auth_db`.

## Local development

```bash
cp .env.example .env
npm install
npm run build
npm test
npm run migration:run
npm start
```

Run migrations against a dedicated `auth_db`. Do not point this service at the
monolith database until a reviewed data migration and cutover plan exists.
