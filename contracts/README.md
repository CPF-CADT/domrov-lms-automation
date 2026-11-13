# DOMROV Service Contracts

These files are the WP-0 source of truth for service boundaries. They describe
the target APIs; the existing monolith remains the compatibility implementation
until each work package is migrated.

| Contract | Owner | Purpose |
| --- | --- | --- |
| `auth/openapi.yaml` | Auth Service | Identity and user profile APIs |
| `academic/openapi.yaml` | Academic Service | Classes, assignments, and submissions |
| `payment/openapi.yaml` | Payment Service | Wallet and credit reservation APIs |
| `rabbitmq/` | Evaluation/Payment/Auth services | Internal RabbitMQ events, commands, and payload schemas |

HTTP conventions and health endpoints are defined in
`docs/microservices-conventions.md`. The current-to-target mapping is in
`docs/microservices-boundary-map.md`.

The contracts intentionally use string IDs even where the current monolith
returns numeric IDs. During migration, adapters must perform the conversion;
new service APIs must not expose database-specific ID types as a coupling.

RabbitMQ contracts are transport-level contracts. They define the message
envelope, routing keys, payload schemas, and queue topology; they do not share
service entities or database models.
