# Payment Service

Payment and wallet bounded context for DOMROV. This service owns `payment_db` and never reads the Auth, Academic, or AI databases.

## Endpoints

- `GET /wallet` (JWT)
- `GET /credit-packages`
- `POST /payments` (JWT, `Idempotency-Key`)
- `POST /credits/reservations` (service token, `Idempotency-Key`)
- `POST /credits/reservations/:id/commit` (service token, `Idempotency-Key`)
- `POST /credits/reservations/:id/release` (service token, `Idempotency-Key`)
- `POST /wallet/refund` (service token, `Idempotency-Key`)
- `GET /health/live`, `GET /health/ready`, `GET /metrics`

The refund route is required by the production PRD but is not currently listed in `contracts/payment/openapi.yaml`; this implementation keeps it internal and does not alter the shared contract.

## Local development

```bash
cp .env.example .env
npm install
npm run build
npm test
npm run migration:run
npm start
```

`userId` is an external Auth identifier. No Auth repository or entity is imported.
