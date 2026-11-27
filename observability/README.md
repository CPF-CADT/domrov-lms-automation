# DOMROV local observability

The root `docker-compose.yml` starts the application and Loki, Alloy, Tempo, the OpenTelemetry Collector, Prometheus, cAdvisor and Grafana as independent containers. Blackbox and PostgreSQL exporters cover the gateway, backend readiness and local databases. Prometheus also scrapes RabbitMQ’s built-in exporter.

## Start

Use Docker Compose 2.23.1 or later. On an Apple Silicon Mac with 24 GB of RAM, start with an 8 GB Docker Desktop VM budget and raise it if backend image builds or code sandboxes need more room. Ollama memory is separate.

From the repository root:

```bash
docker compose up -d
```

| Interface | Default local URL |
|---|---|
| DOMROV gateway | http://localhost:8088 |
| Grafana | http://localhost:8005 |
| Prometheus targets and rules | http://localhost:9090/targets |

Grafana defaults to user `admin` and password `domrov-local`. Set `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` before the first start to choose different credentials. Grafana stores its credentials in the data volume after initialization. Grafana and Prometheus bind to loopback.

Compose builds the five application images from the checkout and sends traces and metrics to the Collector on the Compose network by default. Local defaults work without an `.env` file. The Collector exports only `service.name` as a constant Prometheus resource label, which keeps the existing `service_name` dashboard queries.

## Check the data

Generate an expected 401 from the User service without credentials:

```bash
curl -i http://127.0.0.1:8088/users/me
```

1. In Grafana, open **DOMROV application logs** or query `{service="user"} | json | status_code=401` in Loki Explore. Find the matching response header `X-Request-ID` in the JSON. Use the log’s **View trace** link to open Tempo. The gateway has its own access log, and the app server span starts at the backend.
2. In Prometheus, query `http_server_request_duration_seconds_count{service_name="user",http_response_status_code="401"}` after an export and scrape cycle. Open **DOMROV overview** for request rates, errors, latency, readiness and database health. Histograms populate after traffic. RabbitMQ latency panels populate as messages are published and processed.
3. Run a synthetic assignment evaluation or code execution through the normal application. In Tempo, use the trace from the initiating HTTP log. Confirm that producer and consumer spans have the same trace ID and that the trace links back to its logs. The generated HTTP 401 is enough to test a single-service trace.
4. The overview shows pending and firing Prometheus rules in Grafana. These rules are for dashboard display only.

### Verify CPU and RAM coverage

In **DOMROV overview**, open **Container CPU usage by service** and **Container RAM working set by service**. The charts sum container usage by Compose service, including the gateway, all five backends, databases, RabbitMQ and the observability services. Prometheus keeps only CPU and RAM samples tagged with the active Compose project and a Compose service name.

1. Check that `cadvisor` shows `UP` on the [Prometheus targets page](http://localhost:9090/targets). Allow at least one minute for the CPU rate to have enough samples.
2. Run `docker compose ps --services --status running` and compare its output with the service names returned by both queries below. Each running service should appear in both results. A stopped service can still appear in a dashboard’s historical time range.

   ```promql
   count by (compose_service) (rate(container_cpu_usage_seconds_total{job="cadvisor"}[1m]))
   count by (compose_service) (container_memory_working_set_bytes{job="cadvisor"})
   ```

3. Run a sample code execution and check the service charts alongside HTTP request rate and p95 latency. cAdvisor uses Linux container cgroups. If Docker Desktop has an `UP` target with missing service series, run the same coverage checks on the Linux deployment host before relying on those charts for the demo.

For config validation inside the containers once Docker is available:

```bash
docker compose run --rm --no-deps otel-collector validate --config=/etc/otelcol-contrib/config.yml
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
docker compose exec alloy alloy validate /etc/alloy/config.alloy
```

## Data handling and storage

- Alloy reads Docker logs for the five services and gateway in the Compose project, keeps the application JSON schema and forwards once to Loki. Trace, span, request and correlation IDs remain queryable fields rather than index labels. Plain text, oversized entries and unexpected fields stay out of Loki.
- The application instrumentation sends OTLP HTTP JSON for spans and bounded cumulative metrics. The Nest services use the pinned OpenTelemetry tracing SDK. Go uses a bounded OTLP emitter with W3C trace context. HTTP attributes are limited to route templates, methods and statuses. Messaging attributes use known operation and routing names. The apps propagate `traceparent` without baggage, and Alloy is the sole logs path. The Collector filters attributes before export.
- The Docker socket is mounted for Alloy log collection and cAdvisor container discovery. A read-only mount does not make the Docker API read-only. Use trusted local images and keep the socket local. cAdvisor has no published host port. PostgreSQL probes use the default Compose development credentials defined in `postgres-exporter/config.yml`.
- Loki and Prometheus retain up to seven days. Tempo retains traces for 48 hours. Grafana data, Alloy positions, Loki data, Tempo data, and Prometheus data use named volumes. A normal Compose `down` keeps these volumes.

## Verification and limits

- The combined Compose configuration and provisioning files passed static checks. All four Nest production builds passed. Synthetic OTLP checks exercised HTTP and RabbitMQ trace continuity, correlated JSON logs, histogram generation and redaction across the five backends. Go tests and vet passed.
- Live startup validation is blocked because the workspace cannot access the Docker Desktop socket. Image pulls, container-native config validators, telemetry ingestion and dashboard rendering in running containers remain unverified. The Payment offline dependency check also requires the uncached `bakong-khqr` package.
- If running under a custom Compose project name, set `COMPOSE_PROJECT_NAME` consistently for all commands so Alloy collects the right project.
