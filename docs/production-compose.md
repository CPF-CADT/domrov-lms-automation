# DOMROV production demo with Docker Compose

## Prepare the release

1. Record the published Git SHA tag from each service's CI workflow for User, Academic, Payment, and Evaluation. Use a VPS architecture that matches the published images.
2. Download the Client and Admin CI artifacts built for your public API origin. Extract them so the app entrypoints are `frontend/client/index.html` and `frontend/admin/index.html`.
3. On VPS 1, install Docker Engine, Compose, host Nginx, and `flock` from util-linux. Place `compose.prod.yml`, `infra/`, `observability/`, and the frontend artifacts in `/srv/domrov/`. Run deployment commands from that directory.
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

Point the four web DNS records below to VPS 1. Allow inbound TCP 80 and 443. Keep `db.domrov.me` on private DNS pointing to VPS 2 and restrict TCP 5432 to VPS 1.

| Public hostname | Host Nginx upstream |
| --- | --- |
| `domrov.me` | `127.0.0.1:8088` |
| `admin.domrov.me` | `127.0.0.1:8088` |
| `api.domrov.me` | `127.0.0.1:8088` |
| `grafana.domrov.me` | `127.0.0.1:8005` |

Set these values in `/srv/domrov/.env.production` before starting Compose:

```dotenv
CLIENT_HOST=domrov.me
ADMIN_HOST=admin.domrov.me
API_HOST=api.domrov.me
GATEWAY_PORT=8088
AUTH_CORS_ORIGIN=https://domrov.me
ADMIN_CORS_ORIGIN=https://admin.domrov.me
API_BASE_URL=https://api.domrov.me
GRAFANA_ROOT_URL=https://grafana.domrov.me/
```

On VPS 1, load the HTTP site first so Certbot can obtain a certificate for all four names. If you use Cloudflare, set the four records to DNS only during certificate setup. The ACME path stays available over HTTP for renewals.

```bash
cd /srv/domrov
sudo apt-get install certbot apache2-utils
sudo install -d -m 0755 /var/www/letsencrypt
sudo install -m 0644 infra/nginx/domrov-http.conf /etc/nginx/sites-available/domrov-http.conf
sudo ln -sfn /etc/nginx/sites-available/domrov-http.conf /etc/nginx/sites-enabled/domrov-http.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/letsencrypt --cert-name domrov.me \
  -d domrov.me -d admin.domrov.me -d api.domrov.me -d grafana.domrov.me
```

Create a separate Nginx credential for Grafana, then enable HTTPS:

```bash
sudo htpasswd -cB /etc/nginx/domrov-grafana.htpasswd domrov-ops
sudo chown root:www-data /etc/nginx/domrov-grafana.htpasswd
sudo chmod 0640 /etc/nginx/domrov-grafana.htpasswd
sudo install -m 0644 infra/nginx/domrov-https.conf /etc/nginx/sites-available/domrov-https.conf
sudo ln -sfn /etc/nginx/sites-available/domrov-https.conf /etc/nginx/sites-enabled/domrov-https.conf
sudo nginx -t && sudo systemctl reload nginx
```

Use `htpasswd -B` without `-c` for subsequent users so existing entries are preserved. Grafana also requires its own sign-in. Keep Cloudflare's SSL mode on **Full (strict)** if you enable its proxy.

Install the renewal reload hook and test certificate renewal:

```bash
sudo install -d /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'systemctl reload nginx' |
  sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx >/dev/null
sudo chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
sudo certbot renew --dry-run
```

Check that HTTP redirects to HTTPS, both frontends load, `https://api.domrov.me/health` returns `200`, and `https://grafana.domrov.me/login` returns `401` before the Nginx sign-in. Then sign in to Grafana, verify a failed application request in Loki, and check readiness, request rate, p95 latency, CPU, and RAM.

Student code execution is disabled in this deployment. Its run and status routes return `503`, and submission file browsing remains available. AI evaluation requires a reachable model provider. Unmatched API routes return `404`.
