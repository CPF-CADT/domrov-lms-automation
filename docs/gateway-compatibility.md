# Frontend API gateway compatibility

The frontend should use one API origin while the backend is being extracted:

```text
Local Docker Compose: http://localhost:8088
```

Set the frontend API base URL to the gateway origin. Do not point the frontend
directly at individual service ports.

## Legacy route mapping

| Frontend path | Destination |
|---|---|
| `/auth`, `/users` | User Service |
| `/class`, `/team`, `/assessments`, `/submissions`, `/file` | Academic Service, rewritten to `/api/academic/...` |
| `/wallet`, `/payment` | Payment Service |
| `/evaluations` | AI Service HTTP API |
| `/notifications` | User Service |
| `/admin/users` | User Service |
| `/admin/wallet` | Payment Service |
| `/admin/dashboard` | Academic Service |
| `/admin/evaluations`, `/admin/usage`, `/admin/logs` | AI Service |
| Unmatched `/admin/*` | Legacy backend compatibility service |

The gateway also keeps `/api/auth`, `/api/users`, `/api/academic`,
`/api/payment`, and `/api/ai` available for direct service-prefixed testing.

## Local usage

Start the gateway with the service stack:

```bash
docker compose -f infra/docker-compose.yml up -d
curl http://localhost:8088/health
```

Only unmatched `/admin/*` requests use the existing backend on the host at
`host.docker.internal:3000`. Override that fallback when needed:

```bash
LEGACY_BACKEND_HOST=legacy-backend LEGACY_BACKEND_PORT=3000 \
  docker compose -f infra/docker-compose.yml up -d gateway
```

## WebSockets

The local Nginx gateway forwards HTTP/1.1 upgrade headers, so the Payment
Service Socket.IO events remain available through the same gateway origin.
