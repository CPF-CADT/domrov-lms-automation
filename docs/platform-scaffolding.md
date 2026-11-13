# Platform scaffolding

WP-5 through WP-7 are represented by the files under `infra/` and `.github/workflows/`.

## Local development

```bash
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up --build
docker compose -f infra/docker-compose.observability.yml up -d
```

The platform provisions four logically separate PostgreSQL databases (`auth_db`, `academic_db`, `payment_db`, and `ai_db`) and Redis. Replace the default local image variables with built service images when the service implementations are available.

## Kubernetes

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/config/
kubectl apply -f infra/k8s/databases.yaml
kubectl apply -f infra/k8s/services.yaml
kubectl apply -f infra/k8s/deployments.yaml
kubectl apply -f infra/k8s/hpa.yaml
kubectl apply -f infra/k8s/policies.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

`infra/k8s/config/secrets.example.yaml` is a template only. Create a real Secret through a secret manager or an untracked manifest; never commit production credentials.

The Kubernetes database manifests are study-environment scaffolding. Production should use managed PostgreSQL and Redis with the same service-owned connection variables.
