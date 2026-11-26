# DOMROV Service Contracts

These files record HTTP and RabbitMQ service boundaries. The current backend
contains User, Academic, Payment, Evaluation, and Go Code Execution services;
see the root `docker-compose.yml` and service READMEs for runtime configuration.
The original WP-0 contracts must be checked against runtime behavior before
production rollout; this cleanup does not change their API or message schemas.

| Contract | Owner | Purpose |
| --- | --- | --- |
| `auth/openapi.yaml` | User Service | Identity and user profile APIs |
| `academic/openapi.yaml` | Academic Service | Classes, assignments, and submissions |
| `payment/openapi.yaml` | Payment Service | Wallet and credit reservation APIs |
| `rabbitmq/` | Evaluation/Payment/Auth services | Internal RabbitMQ events, commands, and payload schemas |

HTTP conventions and health endpoints are defined in
[microservices conventions](../docs/microservices-conventions.md). Current service
ownership is in [README.md](../README.md); the
[original boundary map](../docs/microservices-boundary-map.md) is deprecated history.

The contracts use string IDs. Compatibility adapters must preserve existing
client behavior without exposing database-specific ID types as a coupling.

RabbitMQ contracts are transport-level contracts. They define the message
envelope, routing keys, payload schemas, and queue topology; they do not share
service entities or database models.
