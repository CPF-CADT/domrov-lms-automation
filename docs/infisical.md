# Local Infisical setup

Run these commands from the DOMROV repository root with Docker Desktop running.

## Start Infisical

On a new checkout, generate Infisical's bootstrap secrets once. The command refuses to overwrite an existing file. Preserve this file with Infisical's PostgreSQL volume because the encryption key is needed to recover stored secrets.

```bash
(
  set -e
  umask 077
  set -C
  encryption_key=$(openssl rand -hex 16)
  auth_secret=$(openssl rand -base64 32)
  db_password=$(openssl rand -hex 32)
  printf 'INFISICAL_ENCRYPTION_KEY=%s\nINFISICAL_AUTH_SECRET=%s\nINFISICAL_DB_PASSWORD=%s\n' \
    "$encryption_key" "$auth_secret" "$db_password" > .env.infisical
)
```

```bash
docker compose --env-file .env.infisical -f compose.infisical.yml up -d
curl -fsS http://localhost:8200/api/status
```

Open [Infisical](http://localhost:8200), create the first admin account, and create a Secrets Management project named **DOMROV**. Use its Development environment (slug `dev`). The UI is bound to loopback. PostgreSQL and Redis have no host ports.

## Run DOMROV with Infisical secrets

Add `USER_LOG_LEVEL=warn` in **Development** for a quick test. Set any application secrets you want to manage using the same variable names that [DOMROV Compose](../docker-compose.yml) reads.

| Variable | Where it goes |
| --- | --- |
| `USER_DATABASE_URL`, `ACADEMIC_DATABASE_URL`, `PAYMENT_DATABASE_URL`, `EVALUATION_DATABASE_URL`, `EXECUTION_DATABASE_URL` | Each backend receives only its own value as `DATABASE_URL`. Keep the local defaults unless you intend to replace the connection settings. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | The access key goes to the backends that verify tokens. The refresh key goes to User. |
| `SERVICE_AUTH_TOKEN`, `RABBITMQ_URL`, `BAKONG_TOKEN` | Compose passes each value to the services that use it. |

If you change a database or RabbitMQ password, update the corresponding server credential and client connection URLs together. SMTP and OAuth settings supplied through the User service's existing `BACKEND_ENV_FILE` still use that file.

Install the [Infisical CLI](https://infisical.com/docs/cli/install) on your Mac. Log in to your local instance and use the project ID shown in the UI.

```bash
infisical login --domain http://localhost:8200
infisical run --domain http://localhost:8200 --projectId YOUR_PROJECT_ID --env dev -- \
  docker compose -f docker-compose.yml up -d
```

Verify the test value without printing the container's environment.

```bash
docker compose -f docker-compose.yml exec -T user sh -c 'test "$LOG_LEVEL" = warn' \
  && printf 'Infisical value reached the User container\n'
```

Rerun the wrapped `up` command when managed values change. The regular `docker compose up -d` command still uses the local settings without contacting Infisical.
