# Platform scaffolding

WP-5 through WP-7 are represented by the files under `infra/` and `.github/workflows/`.

## Local development

```bash
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up --build
```

The platform provisions four logically separate PostgreSQL databases (`auth_db`, `academic_db`, `payment_db`, and `evaluation_db`) through Compose. Replace the default local image variables with built service images when needed.
