# Frontend API gateway compatibility

The frontend should use one API origin while the backend is being extracted:

```text
Local Docker Compose: http://localhost:8088
Kubernetes:           https://api.domrov.local
```

Set the frontend API base URL to the gateway origin. Do not point the frontend
directly at individual service ports.

## Legacy route mapping

| Frontend path | Destination |
|---|---|
| `/auth`, `/users` | Auth Service |
| `/class`, `/team`, `/assessments`, `/submissions`, `/file` | Academic Service, rewritten to `/api/academic/...` |
| `/wallet`, `/payment` | Payment Service |
| `/evaluations` | AI Service HTTP API |
| `/notifications`, `/admin` | Legacy backend compatibility service |

The gateway also keeps `/api/auth`, `/api/users`, `/api/academic`,
`/api/payment`, and `/api/ai` available for direct service-prefixed testing.

## Local usage

Start the gateway with the service stack:

```bash
docker compose -f infra/docker-compose.yml up -d
curl http://localhost:8088/health
```

The default `/notifications` and `/admin` upstream is the existing backend on
the host at `host.docker.internal:3000`. Override it when needed:

```bash
LEGACY_BACKEND_HOST=legacy-backend LEGACY_BACKEND_PORT=3000 \
  docker compose -f infra/docker-compose.yml up -d gateway
```

For Kubernetes, provide a `legacy-backend` Service on port `3000` until
notifications and admin functionality are extracted. The gateway deliberately
does not invent new service behavior for those routes.

## WebSockets

The local Nginx gateway forwards HTTP/1.1 upgrade headers, so the Payment
Service Socket.IO events remain available through the same gateway origin.
