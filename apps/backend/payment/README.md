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

Receipt uploads are saved before OCR below `LOCAL_FILE_ROOT/permanent/payment-receipts/<payment-id>/`.
Compose mounts `${EBS_MOUNT_PATH:-./.local-ebs/files}` at `/data/files` for the payment service.
The mount must be writable by the container's `node` user (UID 1000). Receipt file keys,
SHA-256 checksums, sizes and upload times are stored in payment metadata. Files are retained
when OCR or verification fails and are not served publicly.

### Real KHQR on a local development stack

Local app execution can use live Bakong payments. Set these in the Compose project `.env` (or the payment service `.env` when running Nest directly):

```dotenv
BAKONG_MODE=live
BAKONG_API_URL=https://api-bakong.nbc.gov.kh/v1
BAKONG_TOKEN=your-bakong-api-token
BAKONG_ACCOUNT_TYPE=individual
BAKONG_BANK_ACCOUNT=your-registered-bakong-account-id
MERCHANT_NAME=Your registered display name
MERCHANT_CITY=PHNOM PENH
```

For a merchant account, set `BAKONG_ACCOUNT_TYPE=merchant` and also configure `BAKONG_MERCHANT_ID` and `BAKONG_ACQUIRING_BANK`. Do not commit the token or real account details. Mock mode no longer returns a QR that could be mistaken for a real payable QR. The service generates and validates dynamic QR payloads with Bakong's `bakong-khqr` SDK and uses live Bakong verification before crediting a wallet.
