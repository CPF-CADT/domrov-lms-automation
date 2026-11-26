# Current local platform

The root `docker-compose.yml` defines the local runtime. It starts five backend
services, five logically separate PostgreSQL databases (`auth_db`, `academic_db`,
`payment_db`, `evaluation_db`, and `execution_db`), RabbitMQ, and the Nginx gateway.
Four backend services use NestJS; Code Execution uses Go. Python, Redis/RQ, and
the former monolithic backend are not part of this Compose stack.

## Local development

Provide the environment file referenced by `BACKEND_ENV_FILE` (default:
`apps/backend/.env`) using the service-specific environment examples. Review
service READMEs for required configuration. Then validate and start the stack:

```bash
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml up --build
```

The gateway listens at `http://localhost:8088` by default. Frontends run
separately and should use this API origin. Academic files use the `academic_files`
volume; Payment retains its configured local/EBS mount; Code Execution uses a
separate workspace and requires Docker access for its sandbox worker.

## Existing automation

- `user.yml`, `academic-service.yml`, and `payment-service.yml` retain their
  existing service checks and image builds.
- `microservice-images.yml` manually validates/builds any of the five services
  and optionally publishes a Git-SHA-tagged image. Publishing needs the
  `DOCKER_USERNAME` repository variable and `DOCKERHUB_TOKEN` secret.
- `ci-cd-pipeline.yml` retains the two frontend S3 deployments, restricted to
  `main` for both push and manual runs. A manual run from `main` deploys both
  frontends; a push deploys only the changed frontend directories.
- `summary.yml` remains active for issue summaries.

This is the current automation inventory. A new CI/CD pipeline and K3s deployment
are not implemented by the cleanup.

## Dependencies before production rollout

- `infra/rabbitmq/definitions.json` and the original RabbitMQ contract tables use
  earlier queue names, including `domrov.ai.evaluation.requested`. Current service
  defaults include `domrov.evaluation.events`, `domrov.evaluation.worker`,
  `auth-commands`, and `domrov.code.execution.worker`. Reconcile broker topology,
  runtime settings, and contracts in a separately scoped change. The definitions
  use a direct commands exchange while current NestJS clients configure a topic
  exchange; that mismatch also needs review. No contracts or runtime settings
  are changed by this cleanup.
- Unmatched `/admin/*` requests still use the gateway's configured legacy host
  fallback. Keep it until route coverage is verified; see
  [gateway compatibility](gateway-compatibility.md).
- The frontend workflow retains its existing AWS secrets and bucket setup.
  Successful static workflow validation does not verify AWS access or deployment.
- `terraform/`, [TASK.md](../TASK.md), the
  [WP-0 boundary map](microservices-boundary-map.md), and
  [shared EBS design](local-ebs-storage.md) contain deprecated historical guidance.
