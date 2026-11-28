# DOMROV production demo with Docker Compose

## Prepare the release

1. Record the published Git SHA tag from each service's CI workflow for User, Academic, Payment, and Evaluation. Use a VPS architecture that matches the published images.
2. Download the Client and Admin CI artifacts built for your public API origin. Extract them so the app entrypoints are `frontend/client/index.html` and `frontend/admin/index.html`.
3. On a Linux VPS, install Docker Engine, Compose, and `flock` from util-linux. Copy `compose.prod.yml`, `infra/deploy/release.sh`, and the `infra/gateway/`, `infra/rabbitmq/`, and `observability/` files referenced by Compose, together with the frontend artifacts. Run deployment commands from that directory.
4. Provision `.env.production` on VPS 1 with file permissions set to `600`. Fill in the database URLs, registry namespace, public domains, and secrets. If the images are private, authenticate to the registry as the deployment account with a pull-only credential. Create `RECEIPTS_DIR` and give the container's `node` user (UID 1000) write access. Back up that directory and the Academic volume.

## Prepare PostgreSQL on VPS 2

Create a database and dedicated login for each of the four backends. Allow PostgreSQL connections only from VPS 1 over the private network. Use a separate restricted monitoring login for `POSTGRES_EXPORTER_DSN`, which monitors the PostgreSQL instance. Evaluation currently synchronizes its schema at startup. Use a backed-up demo database.

## Pull and start

Keep runtime settings and image tags in `.env.production`. Set `USER_IMAGE_TAG`, `ACADEMIC_IMAGE_TAG`, `PAYMENT_IMAGE_TAG`, and `EVALUATION_IMAGE_TAG` to the four published tags, one assignment per line.

In the deployment shell, define a shortcut that loads both files in order.

```bash
prod() { docker compose --env-file .env.production -f compose.prod.yml "$@"; }

prod config --quiet &&
prod pull &&
prod up -d --wait rabbitmq &&
prod exec -T rabbitmq rabbitmqctl import_definitions /etc/rabbitmq/definitions.json &&
prod run --rm --no-deps user npm run migration:run &&
prod run --rm --no-deps academic-service npm run migration:run &&
prod up -d --no-build --wait --wait-timeout 180 &&
prod ps
```

Payment runs migrations on startup. Update the image tags for subsequent releases and repeat the sequence. Back up PostgreSQL before migrations. Deploy the previous tags and frontend artifacts for an application rollback, checking schema compatibility first.

## Connect GitHub Actions CD to the VPS

The active CD workflows verify deployments on GitHub-hosted runners. To switch a workflow to the VPS, configure the GitHub `production` environment and update the caller to use `.github/workflows/_vps-cd.yml` with its required inputs. The VPS workflow supports User, Academic, Payment, Evaluation, Client, and Admin.

| Setting | Where |
| --- | --- |
| `VPS_HOST`, `VPS_USER`, `VPS_DEPLOY_DIR` | Environment variables. Use the VPS hostname or IPv4 address, deployment account, and absolute stack directory. |
| `VPS_SSH_PRIVATE_KEY`, `VPS_SSH_KNOWN_HOSTS` | Environment secrets. Use the deployment account's authorized key and a known-hosts entry verified against the VPS host key. |

The deployment account needs Docker access and write access to the deployment directory. If upgrading an existing stack that mounts the frontend folders individually, apply the updated Compose file to recreate the gateway once so it sees the parent frontend directory.

After CI succeeds for a push to `main`, CD automatically uses that run's SHA and deploys only the matching service or frontend. The deploy job fails if its VPS settings or SSH secrets are missing. Backend CD stages a private copy of `.env.production` under the deployment lock, changes the selected tag, and runs User or Academic migrations when applicable. It replaces the env file after Compose reports the service healthy and saves the previous tag in `.deploy-state/<service>.previous-tag`. Pause CD while manually editing runtime settings. If the rollout fails, inspect the running container and schema before restoring its previous image. Migration changes can outlive container failures.

Frontend CD uploads the exact CI artifact, switches the app's symlink, and checks that the gateway container reads the new `index.html`. CD stores prior release references in `.deploy-state/` and retains previous frontend builds under `frontend/.releases/`. Run the public HTTPS checks below after deployment.

## HTTPS and verification

Point the client, admin, and API DNS records to VPS 1. Configure a TLS reverse proxy on VPS 1 to forward all three HTTPS hostnames to `127.0.0.1:8088` and preserve the original `Host` header. Enable WebSocket forwarding for `/socket.io/`. If you use a remote load balancer, adapt the gateway bind address for its private network. Publish only the public proxy's web ports.

For a host-level Caddy proxy, a minimal Caddyfile looks like this. Replace all three names with the values in `.env.production`.

```caddyfile
lms.example.com, admin.example.com, api.example.com {
    reverse_proxy 127.0.0.1:8088
}
```

Check that both frontend URLs load and that `https://api.example.com/users/me` returns `401` for an unauthenticated request. Test Google sign-in from the client if configured. Use an SSH tunnel to reach Grafana at VPS 1's `127.0.0.1:8005`. Verify the failed request in Loki and check readiness, request rate, p95 latency, CPU, and RAM in Grafana.

Student code execution is disabled in this deployment. Its run and status routes return `503`, and submission file browsing remains available. AI evaluation requires a reachable model provider. Unmatched API routes return `404`.
