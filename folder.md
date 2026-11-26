# Repository structure

The current backend consists of five services; the root Compose file is the
local runtime definition.

```text
.github/workflows/
  academic-service.yml       # Existing Academic validation/build
  ci-cd-pipeline.yml          # Main-branch frontend S3 deployments
  microservice-images.yml    # Manual validation/build for all five services
  payment-service.yml        # Existing Payment validation/build
  summary.yml                # Issue summaries
  user.yml                   # Existing User validation/build
apps/
  backend/
    user/                    # NestJS, auth_db
    academic/                # NestJS, academic_db
    payment/                 # NestJS, payment_db
    evaluation/              # NestJS, evaluation_db
    code-execution-go/       # Go, execution_db
  admin/                     # React/Vite admin frontend
  react-client/              # React/Vite client frontend
contracts/
  auth/
  academic/
  payment/
  rabbitmq/
infra/
  gateway/
  rabbitmq/
docs/
terraform/                   # Deprecated legacy infrastructure; retained for review
uat/                         # Historical test records
docker-compose.yml
.env.compose.production.example
```

See [README.md](README.md) for service ownership and
[docs/ci-cleanup.md](docs/ci-cleanup.md) for cleanup scope and remaining dependencies.
