# DOMROV security audit 05 · Dependencies, logging, and monitoring

**Reviewed 27 November 2026** · Git HEAD `54547c26` · Read-only review

**Results** · 13 dependency and supply-chain findings and 8 logging and monitoring findings. Highest priorities are the NGINX version range, network-enabled Vite development configuration, Docker socket access from Alloy, and the absence of an alert notification route.

The review compared npm lockfiles, Go module versions, Dockerfile and Compose image references, and CI workflows against selected maintainer advisories and support schedules. Affected package versions and application reachability are called out separately. Registry DNS blocked `npm audit` in all six application directories, and Docker daemon permissions blocked local image inspection. The package findings are a targeted advisory cross-check. Exact deployed digests, image OS packages, Go symbol reachability, external monitoring, and live delivery remain unverified. Severity reflects DOMROV's exposure and the available evidence.

## Vulnerable dependencies and supply chain

### DEP-01 · High · NGINX gateway and frontend image references fall within affected upstream ranges

- **File and lines** — `docker-compose.yml:15–28`, `apps/react-client/Dockerfile:10–12`, `infra/gateway/nginx.conf.template:75–86,120–124`.
- **Code evidence** — Both NGINX references use `nginx:1.27-alpine`. NGINX lists the 1.27 series in the affected ranges for CVE-2026-42945 and CVE-2026-9256, both in the rewrite module. The gateway publishes its HTTP port and uses rewrite directives. The image digest and the advisories' exact configuration prerequisites were unverified.
- **Potential impact** — An affected gateway configuration could suffer memory corruption or service interruption on a network-facing component.
- **Recommended fix** — Use a supported NGINX patch release outside all applicable advisory ranges, record the resolved digest, and scan the built image. Include regression checks for the gateway rewrites. [NGINX security advisories](https://nginx.org/en/security_advisories.html)

### DEP-02 · High · Both frontends lock Vite versions affected by development-server file reads

- **File and lines** — `apps/admin/package-lock.json:6573–6574`, `apps/react-client/package-lock.json:7390–7391`, `apps/react-client/vite.config.js:11–12`, `apps/react-client/Dockerfile.dev:10–12`, `apps/react-client/Dockerfile:8–12`.
- **Code evidence** — Admin locks Vite 7.0.6 and the student client locks 7.3.1. Both match CVE-2026-39363, fixed in 7.3.2 on the 7.x line. The student development configuration explicitly binds to all interfaces. Its 7.3.1 lock also matches CVE-2026-39364. The production Dockerfile serves compiled assets with NGINX.
- **Potential impact** — An accessible development server can expose files readable by that process under the advisory conditions. Admin exposure depends on how its development server is launched.
- **Recommended fix** — Adopt a supported, patched Vite release in both frontends and keep development servers loopback-only unless explicitly needed on a trusted network. [CVE-2026-39363](https://github.com/advisories/GHSA-p9ff-h696-f583) · [CVE-2026-39364](https://github.com/advisories/GHSA-v2wj-q39q-566r)

### DEP-03 · Medium · The user service locks an affected Nodemailer SMTP client

- **File and lines** — `apps/backend/user/package-lock.json:7735–7736`, `apps/backend/user/src/mailer/mailer.service.ts:11–19,34–40`.
- **Code evidence** — The lock resolves Nodemailer 7.0.13. It falls within GHSA-4ffr-jq9g-5ffx and GHSA-4g23-2xm8-66gc, fixed in 10.0.13 and 10.0.10 respectively. DOMROV instantiates the affected SMTP client for OTP delivery. The user image installs from the manifest without its lockfile, so the deployed version was unverified.
- **Potential impact** — A malicious or compromised SMTP peer, or a network actor under applicable plaintext conditions, can stall the Node event loop and interrupt authentication and OTP delivery.
- **Recommended fix** — Select a supported release containing both fixes, deploy from a reproducible lock, require verified SMTP TLS, and test login-related mail flows after the major-version upgrade. [SMTP AUTH advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-4ffr-jq9g-5ffx) · [SMTP reply advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-4g23-2xm8-66gc)

### DEP-04 · Low · The student client locks Axios in a browser advisory range

- **File and lines** — `apps/react-client/package-lock.json:2284–2285`, `apps/react-client/pnpm-lock.yaml:797–798`, `apps/react-client/src/lib/AxiosInstance.ts:1–11,24–26`.
- **Code evidence** — Both lockfiles select Axios 1.14.0, within GHSA-xx6v-rp6x-q39c, fixed in 1.15.1 on the 1.x line. The reviewed client uses Axios with a configured base URL and a bearer header. The advisory requires relevant XSRF configuration or prior prototype pollution and a cross-origin request.
- **Potential impact** — An affected browser request could leak an XSRF token to another origin if the advisory prerequisites are present. The reviewed application configuration did not establish those prerequisites.
- **Recommended fix** — Update to a supported release that clears current advisories, synchronize the supported lockfile, and verify authenticated requests continue to use their intended origins. [Axios advisory](https://github.com/axios/axios/security/advisories/GHSA-xx6v-rp6x-q39c)

### DEP-05 · Medium · Admin build locks a vulnerable transitive Rollup version

- **File and lines** — `apps/admin/package-lock.json:6221–6222,6573–6574`, `apps/react-client/package-lock.json:6893–6894`, `.github/workflows/ci-cd-pipeline.yml:141–152`.
- **Code evidence** — Admin locks Rollup 4.46.2 through the frontend toolchain. The advisory covers 4.x below 4.59.0. The student client locks 4.60.1, outside that advisory's affected range. Admin CI installs and builds the frontend from the repository.
- **Potential impact** — If untrusted input controls build output filenames, files can be written outside the output directory with the build user's permissions. No DOMROV application route was found that controls those build settings.
- **Recommended fix** — Update the admin Vite/Rollup dependency chain, confirm the resolved Rollup version and scan the lockfile in CI. [CVE-2026-27606](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)

### DEP-06 · Low · The admin React Router lock matches a conditional redirect advisory

- **File and lines** — `apps/admin/package-lock.json:6136–6137`, `apps/admin/src/main.tsx:3–11`, `apps/react-client/package-lock.json:6787–6788`, `apps/react-client/src/main.tsx:3–11`.
- **Code evidence** — Admin resolves React Router 7.8.0, within the CVE-2025-68470 range below 7.9.6 on the 7.x line. The student client resolves 7.13.2. Both use declarative `BrowserRouter`. Framework/RSC advisories reviewed for this audit have different prerequisites.
- **Potential impact** — Passing untrusted paths to affected navigation APIs could redirect a user to an external site. No matching path was confirmed in the reviewed admin navigation.
- **Recommended fix** — Update to a currently patched release and constrain externally derived navigation paths to intended in-app routes. [CVE-2025-68470](https://github.com/advisories/GHSA-9jcx-v3wj-wh4m)

### DEP-07 · Low · Go modules match advisories for features whose reachability is unverified

- **File and lines** — `apps/backend/code-execution-go/go.mod:5–16`, `apps/backend/code-execution-go/internal/store/store.go:16–28,37–47`.
- **Code evidence** — pgx 5.7.2 matches CVE-2026-41889, fixed in 5.9.2. The service opens the standard database driver and uses parameterized statements in the reviewed paths. The advisory requires a non-default simple protocol and a specific SQL query shape that was not identified. Indirect `golang.org/x/crypto` 0.31.0 matches GO-2025-4134 for the SSH server package, fixed in 0.45.0. The execution service's reviewed entry points do not start an SSH server.
- **Potential impact** — Future use of the affected query mode or SSH server functionality could expose SQL integrity or service availability. A vulnerable module version alone does not demonstrate a reachable vulnerable symbol.
- **Recommended fix** — Refresh the Go dependency set to supported patched versions and use source-mode `govulncheck` against the service and the actual build toolchain to prioritize reachable findings. [pgx advisory](https://github.com/advisories/GHSA-j88v-2chj-qfwx) · [Go vulnerability report](https://pkg.go.dev/vuln/GO-2025-4134)

### DEP-08 · Medium · Node.js 20 and public RabbitMQ 3.13 images are beyond community support

- **File and lines** — `apps/react-client/Dockerfile:1`, `apps/react-client/Dockerfile.dev:1`, `.github/workflows/ci-cd-pipeline.yml:51–57,143–150,176–183`, `docker-compose.yml:330–334`.
- **Code evidence** — The Dockerfiles and legacy CI select Node.js 20, which reached end of life on 30 April 2026. Compose uses the public `rabbitmq:3.13-management-alpine` line and publishes broker and management ports. RabbitMQ states that new patches for 3.13 are limited to paying customers.
- **Potential impact** — Builds and broker services on those public channels stop receiving routine community fixes. Broker exposure depends on the host's network controls.
- **Recommended fix** — Move the CI and dev/build environments to a supported Node LTS. Plan a RabbitMQ upgrade using the vendor's supported path and test message routing and persistence before replacing the broker. [Node.js release schedule](https://github.com/nodejs/Release#release-schedule) · [RabbitMQ 3.13 support status](https://www.rabbitmq.com/docs/3.13)

### DEP-09 · Medium · The observability healthcheck uses an older Go security patch

- **File and lines** — `observability/healthcheck/Dockerfile:1–8`, `observability/healthcheck/main.go:1–27`, `apps/backend/code-execution-go/Dockerfile:1–6`, `apps/backend/code-execution-go/go.mod:3`.
- **Code evidence** — The helper pins the Go builder tag to 1.26.5 and uses `net/http`. The vendor documents later security fixes in Go 1.26.6, including in `net/http` and `crypto/tls`. The execution service uses a floating 1.26 builder and declares a minimum of 1.26.5, so its actual compiler patch level cannot be inferred from `go.mod` alone.
- **Potential impact** — Images built with the pinned helper tag can contain older standard-library code. Whether the specific affected code paths are used and whether the helper image is deployed were unverified.
- **Recommended fix** — Rebuild Go binaries using a current supported patch release and record the builder digest and compiler version with the build. [Go release history](https://go.dev/doc/devel/release)

### DEP-10 · High · Three production Dockerfiles bypass their checked-in npm locks

- **File and lines** — `apps/backend/user/Dockerfile:1–13`, `apps/backend/academic/Dockerfile:1–13`, `apps/backend/payment/Dockerfile:1–14`, `apps/backend/evaluation/Dockerfile:1–12`.
- **Code evidence** — User, Academic, and Payment copy only `package.json` and invoke `npm install` separately in build and runtime stages. Evaluation copies the lock and uses `npm ci`.
- **Potential impact** — Images can resolve a different dependency graph from CI or the reviewed lockfile, and two stages can resolve different artifacts. A lockfile advisory check cannot certify those runtime images.
- **Recommended fix** — Copy each manifest and its lockfile into both stages. Use lockfile-enforced installs for build and runtime, document packages that require trusted lifecycle scripts, and scan the resulting production images.

### DEP-11 · Medium · CI publishes without a checked-in dependency or image advisory gate

- **File and lines** — `.github/workflows/microservice-images.yml:31–69,125–164`, `.github/workflows/ci-cd-pipeline.yml:47–63,71–104`.
- **Code evidence** — The reviewed jobs install, test, build, and publish images. No package, Go vulnerability, or built-image scanner is configured as a gate in those paths. GitHub account-level alerts were outside the review.
- **Potential impact** — Newly disclosed issues and vulnerable base-image OS packages can remain in releases until reviewed manually.
- **Recommended fix** — Scan npm locks, run Go reachability checks, and scan the built image before publishing. Generate an SBOM per released digest and schedule advisory rescans for unchanged releases.

### DEP-12 · Medium · Deployment workflows use mutable action tags

- **File and lines** — `.github/workflows/ci-cd-pipeline.yml:71–96,111–118,155–162,188–195`, `.github/workflows/microservice-images.yml:125–160`.
- **Code evidence** — Workflow steps refer to version tags for registry login, image publishing, SSH deployment, and S3 upload. Some steps receive deploy or provider credentials.
- **Potential impact** — If a referenced tag changes or its upstream action is compromised, privileged CI jobs can execute different code with access to deployment capabilities.
- **Recommended fix** — Pin privileged actions to reviewed full commit SHAs or use verified workflow dependency locks. Scope deployment credentials and keep them in protected release jobs. [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)

### DEP-13 · Medium · Monitoring and runner images can change without a repository diff

- **File and lines** — `docker-compose.yml:359,468,476,494,502,512,525,533`, `apps/backend/code-execution-go/Dockerfile:1–8`, `apps/backend/code-execution-go/internal/execution/sandbox.go:24–33`.
- **Code evidence** — Loki, Alloy, Prometheus, postgres-exporter, and Grafana use `:latest`. Other images use version or family tags without digests, including the Docker CLI, PostgreSQL, and language sandbox images.
- **Potential impact** — Image pulls can change the actual components and advisories present. An unexpected monitoring regression can also reduce incident visibility.
- **Recommended fix** — Record reviewed versions and digests, scan with the intended OS and architecture, and use scheduled updates to keep pins current.

## Logging and monitoring

### MON-01 · High · Alert evaluations have no configured notification route

- **File and lines** — `observability/prometheus/prometheus.yml:1–16`, `observability/prometheus/rules.yml:1–41`, `observability/README.md:25–36`, `docker-compose.yml:510–547`.
- **Code evidence** — Prometheus loads rules and scrapes targets. The checked-in configuration lacks an Alertmanager destination or equivalent receiver, and the README explicitly describes the rules as dashboard-only.
- **Potential impact** — A rule can enter firing state while the responsible person receives no message. Detection then depends on someone watching Grafana or Prometheus.
- **Recommended fix** — Wire the rules to Alertmanager or a managed receiver, set ownership and routing, and verify delivery with a synthetic alert on the intended notification channel. [Prometheus alerting architecture](https://prometheus.io/docs/alerting/latest/overview/)

### MON-02 · Medium · Security signals are queryable but have no checked-in alert rules

- **File and lines** — `observability/prometheus/rules.yml:4–41`, `observability/README.md:25–36`, `apps/backend/user/src/logging/index.ts:193–208`.
- **Code evidence** — The four existing rules cover HTTP readiness, database availability, telemetry-target availability, and a 5xx error ratio. The README demonstrates querying 401s. No rule covers authentication or authorization bursts, administrative changes, or loss of log ingestion.
- **Potential impact** — Abnormal denial rates or loss of security-event visibility can go unnoticed while general availability remains healthy.
- **Recommended fix** — Add low-cardinality counters and minimum-volume alert thresholds for authentication and authorization failures. Route selected high-impact admin events and log pipeline failures using bounded labels and usable triage context. [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet)

### MON-03 · Medium · Authentication and authorization failures lack consistent security events

- **File and lines** — `apps/backend/user/src/auth/auth.service.ts:63–84,170–181,239–269`, `apps/backend/user/src/auth/jwt-auth.guard.ts:10–18`, `apps/backend/user/src/admin/admin-role.guard.ts:5–22`, `apps/backend/academic/src/academic.service.ts:416–423`, `apps/backend/payment/src/payment.gateway.ts:30–43`, `apps/backend/payment/src/logging/index.ts:63–68`.
- **Code evidence** — Login success receives an explicit event. The reviewed login, JWT, OTP, and role-rejection branches throw exceptions that primarily surface through generic request completion records. Expected payment WebSocket authentication rejection uses `debug`, below the default `info` threshold, and follows the socket connection path.
- **Potential impact** — Operators can see an HTTP error code but have less evidence to distinguish invalid credentials, token rejection, and permission failure. Ordinary socket rejection counts are absent from default logs.
- **Recommended fix** — Emit bounded authentication and authorization outcome codes at the guard or service boundary, and count socket failures independently of the log level. Keep passwords, token values, OTPs, and raw account identifiers out of general telemetry.

### MON-04 · Medium · User administration logs lack actor and target accountability

- **File and lines** — `apps/backend/user/src/admin/admin-user.controller.ts:22–36`, `apps/backend/user/src/admin/admin-user.service.ts:35–59`, `apps/backend/user/src/logging/index.ts:22–24,45–60`, `apps/backend/payment/src/payment.service.ts:118–138`.
- **Code evidence** — User admin handlers pass the target ID and operation input to the service. Status, role, and deactivation events log duration without the authenticated actor, target, or change. The operational logger would drop arbitrary new fields. Wallet adjustments already persist actor and balance-change metadata in their transaction record.
- **Potential impact** — Investigators can see that an admin action occurred but cannot reconstruct who changed which user or the previous and resulting state using those events alone.
- **Recommended fix** — Create a restricted audit stream with an explicit schema for actor, target, action, minimal before/after state, outcome, timestamp, and correlation ID. Persist consequential changes transactionally with their audit event or an outbox and keep audit data access separate from general logs.

### MON-05 · Medium · Central collection omits infrastructure diagnostics and has limited incident history

- **File and lines** — `observability/alloy/config.alloy:16–35,37–43,106–110`, `infra/gateway/nginx.conf.template:74–80`, `observability/loki/config.yml:33–45`, `observability/tempo/config.yml:14–24`.
- **Code evidence** — Alloy selects five services plus the gateway and drops unstructured or oversized entries. RabbitMQ and PostgreSQL application logs fall outside the collection selector. Gateway request-level diagnostic errors go to `/dev/null`. Loki retains 168 hours and Tempo 48 hours.
- **Potential impact** — Broker, database, proxy, or dropped-log events can leave gaps in centralized incident timelines. Investigations started after retention windows may lose relevant evidence unless an external archive exists.
- **Recommended fix** — Define a retention policy for security events. Collect selected and sanitized infrastructure events through a restricted path and monitor the number of discarded records instead of forwarding raw diagnostics.

### MON-06 · Low · Browser upload diagnostics bypass the central masking path

- **File and lines** — `apps/react-client/src/services/FileUploadService.ts:146–157,184–190`, `apps/react-client/src/lib/AxiosInstance.ts:24–38`, `observability/alloy/config.alloy:16–35,45–68`.
- **Code evidence** — Upload diagnostics print filenames, resource keys, a backend response, and an error object. The common Axios response interceptor often converts failures to a plain Error. This path runs in the browser and is outside Alloy's Docker log filter.
- **Potential impact** — Resource identifiers and filenames can be exposed through browser console capture or support recordings. A raw credential leak was not verified.
- **Recommended fix** — Keep browser diagnostics to a safe operation name, status, error code, and request ID. Apply matching allowlists to any future browser telemetry exports.

### MON-07 · High · The logging collector can access the Docker daemon socket directly

- **File and lines** — `docker-compose.yml:474–487`, `observability/alloy/config.alloy:6–13,31–35`, `observability/README.md:46–51`.
- **Code evidence** — Alloy connects directly to `/var/run/docker.sock` for discovery and log reads. The mount is marked `:ro`, which does not authorize Docker API commands. The service also uses a mutable image tag.
- **Potential impact** — A compromised collector with socket access can potentially control containers or access other services' data. The actual host exposure depends on the daemon security model and collector privileges.
- **Recommended fix** — Use a log transport without the host socket, or put a policy-enforcing proxy in front of it that permits only discovery and log reads. Pin and scan the collector image and constrain its network access. [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet)

### MON-08 · Medium · Internal telemetry endpoints rely on access to the Compose network

- **File and lines** — `observability/loki/config.yml:1–5`, `observability/alloy/config.alloy:153–156`, `observability/otel-collector/config.yml:5–11,37–49`, `docker-compose.yml:465–507,517–539`.
- **Code evidence** — Loki disables auth and Alloy writes over internal HTTP. OTLP reception binds to all container interfaces without authentication in the receiver configuration, and Collector-to-Tempo TLS is disabled. Compose binds the Grafana and Prometheus host ports to loopback and disables Grafana anonymous access.
- **Potential impact** — A workload that can reach those internal endpoints could read or submit telemetry, depending on the endpoint. This can expose operational details or reduce trust in the evidence. Live network access was unverified.
- **Recommended fix** — Restrict telemetry networks and endpoint access to required services. Authenticate ingestion and query paths that cross trust boundaries and encrypt transport there.

## Existing controls verified in the repository

- The gateway generates a request ID and forwards it to the backend. The user service validates request and correlation ID formats, returns a request ID header, and attaches IDs to JSON log entries. The Collector filters trace and metric attributes. `infra/gateway/nginx.conf.template:93–97` · `apps/backend/user/src/logging/index.ts:17–28,180–208` · `observability/otel-collector/config.yml:18–31`.
- Alloy allowlists structured application fields, drops nonconforming entries, and keeps request and trace IDs as queryable metadata. The Nest logger uses fixed messages and classified fields. These controls are present in source. Live end-to-end collection and masking were outside this review. `observability/alloy/config.alloy:37–109,131–149` · `apps/backend/user/src/logging/index.ts:45–80,98–115`.
