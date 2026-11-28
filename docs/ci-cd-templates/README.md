# Per-service CI and CD templates

The [workflow templates](workflows) are mock examples for sharing. The active workflows in `.github/workflows/` run deployment demos on GitHub-hosted runners. The five backend workflows pull the CI image by commit SHA, start it with temporary PostgreSQL and RabbitMQ, check readiness, and remove the containers and volumes. Client and Admin download the CI artifact, serve it through Nginx, verify the entry page, and remove the container. These demos need no VPS or SSH configuration. Code Execution checks startup and readiness without submitting code. See the [production Compose guide](../production-compose.md) for live hosting.

| Service | CI | Mock CD | Compose target |
| --- | --- | --- | --- |
| User | `user-ci.yml` | `user-cd.yml` | `user` |
| Academic | `academic-ci.yml` | `academic-cd.yml` | `academic-service` |
| Payment | `payment-ci.yml` | `payment-cd.yml` | `payment-service` |
| Evaluation | `evaluation-ci.yml` | `evaluation-cd.yml` | `evaluation-service` |
| Code Execution | `code-execution-ci.yml` | `code-execution-cd.yml` | `code-execution` on a separate worker host |

## GitHub setup

- In **Settings → Secrets and variables → Actions**, add the repository variable `DOCKER_USERNAME` with the Docker Hub username and the repository secret `DOCKERHUB_TOKEN` with write access to the image repositories. Use the same Docker Hub namespace in the server's `DOCKER_REGISTRY`.
- Pull requests build Docker images. Pushes to `main` publish the image for each changed service under the full commit SHA. Changes to the shared CI workflow rebuild all five services.
- Each CD workflow must exist on the default branch. It previews deployment only after a successful publishing workflow from a push to `main`. It uses that workflow's `head_sha` for the service tag.

## What the mock shows

If only Payment changes, only Payment CI builds and publishes. Payment CD prints the new `PAYMENT_IMAGE_TAG` and the commands to pull and start `payment-service`. The other four tags do not change. The mock prints commands without connecting to a server or changing an env file. It needs no SSH secrets.

## When you connect a VPS

Bootstrap the stack using the [production Compose guide](../production-compose.md). Keep `.env.production` on the VPS. Replace the mock with your SSH deployment step and run the printed commands in the deployment directory. Serialize deployments on the host with a shared lock around the release file update, pull, and rollout so concurrent services cannot overwrite each other's tags. Keep the previous tag and record the new tag after the service passes its health check. Prepare any required database migrations before rolling out an image that needs them.

Production Compose currently runs User, Academic, Payment, and Evaluation. The Code Execution mock uses `compose.worker.yml` as a placeholder for a separate isolated worker deployment. That Compose file is not included. The React frontends follow the static build and upload process in the production guide.

## Frontend CI and mock CD

| App | CI | Mock CD | VPS path relative to the Compose file |
| --- | --- | --- | --- |
| React Client | `react-client-ci.yml` | `react-client-cd.yml` | `frontend/client/` |
| React Admin | `admin-ci.yml` | `admin-cd.yml` | `frontend/admin/` |

Each CI workflow runs `npm ci` and `npm run build` when its app or CI file changes. On `main`, it uploads the static build as a GitHub Actions artifact named with the commit SHA. Mock CD downloads that artifact from the exact successful CI run, checks for `index.html`, and prints the target directory. These frontend workflows need no Docker Hub or SSH credentials.

Use the repository variable `PRODUCTION_API_BASE_URL` to override the build-time API origin, which defaults to `https://api.domrov.me`. Admin uses it at build time. Production Nginx serves the Client runtime config from Compose's `API_BASE_URL`. Keep both values aligned.
