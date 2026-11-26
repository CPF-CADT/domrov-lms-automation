# Block 1: repository and CI/CD cleanup

## Basis and patch availability

The cleanup was adapted directly to the clean checkout at `9016b86` on the local
branch `chore/ci-cleanup`. No pre-existing working-tree changes were present.
`0001-ci-cleanup.patch` was not present in the checkout or supplied in the
conversation. Its location was requested; patch-specific review and reconciliation
remain pending. This report does not claim the missing patch was applied.

## Behavior after cleanup

- The former Python AI workflow and malformed StarCoder review workflow are removed.
- The old monolith test, backend/Python image publishing, and EC2 restart jobs are
  removed from the existing frontend workflow.
- Both frontend builds and S3 sync steps retain their source directories, API URL,
  AWS secret names, bucket names, and sync arguments. Checkout and Node setup use v4.
- Push deployments remain limited to changed frontend directories on `main`.
  Manual runs on `main` deploy both frontends; other branch and tag selections
  skip change detection and both deployment jobs.
- Issue summaries remain enabled. The generated response is passed through an
  environment variable and quoted as a shell argument, alongside the issue number
  and repository. No generated response is interpolated into shell source.
- All four existing microservice workflows are preserved byte for byte.
- Documentation describes four NestJS services and one Go service, their five
  databases, and the root Compose runtime. Legacy deployment/migration guidance
  is explicitly deprecated rather than executed or deleted.
- The obsolete infrastructure-specific password ignore rule is replaced by
  `.db_password`, protecting that filename at any depth.

## Files changed

| File | Change |
| --- | --- |
| [.github/workflows/ci-cd-pipeline.yml](../.github/workflows/ci-cd-pipeline.yml) | Retire old backend jobs; preserve and guard frontend deployment |
| [.github/workflows/summary.yml](../.github/workflows/summary.yml) | Quote environment variables; select the issue repository explicitly |
| [.gitignore](../.gitignore) | Replace duplicate obsolete password paths with a general filename rule |
| [README.md](../README.md) | Correct service architecture, paths, runtime, and automation inventory |
| [folder.md](../folder.md) | Replace obsolete source tree with current directories and workflows |
| [TASK.md](../TASK.md) | Mark the old migration plan deprecated |
| [apps/react-client/architecture.md](../apps/react-client/architecture.md) | Correct the backend location and gateway boundary |
| [contracts/README.md](../contracts/README.md) | Correct documentation context and links; no contract changes |
| [contracts/rabbitmq/README.md](../contracts/rabbitmq/README.md) | Remove Python runtime claim; identify historical topology tables |
| [docs/gateway-compatibility.md](gateway-compatibility.md) | Document current Evaluation and Go execution routes |
| [docs/local-ebs-storage.md](local-ebs-storage.md) | Mark removed storage design and migration instructions deprecated |
| [docs/microservices-boundary-map.md](microservices-boundary-map.md) | Mark the original WP-0 baseline deprecated |
| [docs/platform-scaffolding.md](platform-scaffolding.md) | Document five services/databases and existing deployment dependencies |
| [docs/rabbitmq-platform.md](rabbitmq-platform.md) | Distinguish historical topology from current runtime configuration |
| [terraform/README.md](../terraform/README.md) | Deprecate former deployment guidance while retaining infrastructure history |
| [terraform/user_data.sh](../terraform/user_data.sh) | Add a deprecation header; executable behavior is preserved |
| [uat/uat-execution-report.md](../uat/uat-execution-report.md) | Identify the older four-database test report as historical evidence |

Removed:

- `.github/workflows/ai-service.yml`
- `.github/workflows/ci-ai-code-review.yml`

Created:

- `docs/ci-cleanup.md` (this report)

No application business logic, database schema, HTTP/message schema, Compose
service definition, gateway configuration, or Terraform resource was changed.
No new pipeline or K3s deployment was implemented.

## Validation results

All listed checks passed locally with exit code 0:

- `actionlint` v1.7.12 validated all six remaining GitHub Actions workflows.
  Installed under `/tmp/domrov-ci-cleanup/bin`; no repository tooling dependency
  was added. ShellCheck is unavailable in this environment, so its optional
  integration was not run.
- `git diff --check` reported no whitespace errors.
- `bash -n terraform/user_data.sh` passed; the script was not executed.
- All 44 local Markdown file links in changed documentation resolved.
- A local verification script evaluated the actual frontend job conditions for
  32 combinations of push/manual event, main/development/cleanup/tag ref, and
  frontend change outputs. Non-main refs could never deploy, manual main runs
  selected both frontends, and main pushes selected only changed frontends.
- Five summary payloads were passed through the actual Bash command with a
  local `gh` stub: ordinary text, quotes, attempted shell breakout, command
  substitution/backticks, and multiline text. Every response was preserved as
  one literal argument and no injected command executed. No comments were sent.
- The frontend deployment steps were compared with the baseline: only the
  checkout/setup-node action versions changed within those step lists.
- `user.yml`, `academic-service.yml`, `payment-service.yml`, and
  `microservice-images.yml` were compared with the baseline and are unchanged.
- Repository searches, excluding the audit inventory in this report, found
  obsolete source and contract paths only inside explicitly deprecated historical material (`TASK.md`, the WP-0 boundary map,
  the shared EBS note, and the Terraform bootstrap). Existing Python language
  examples in application code and contracts were intentionally preserved.

The condition and shell checks were run from
`/tmp/domrov-ci-cleanup/verification/check-cleanup.py`; they are local verification
artifacts, not new application tests. Workflow execution on GitHub, AWS deployment,
Docker builds, and service integration tests were not run for this cleanup.

## Remaining dependencies and Block 2 readiness

The verified cleanup is a usable baseline for Block 2 planning. Full Block 1
sign-off remains conditional on reviewing and reconciling the missing
`0001-ci-cleanup.patch`.

Before a production rollout or a new deployment pipeline:

- Reconcile runtime RabbitMQ queues with retained broker definitions and contract
  tables. The commands exchange is declared direct in broker definitions while
  current NestJS clients configure topic. Resolving this requires a separately
  scoped runtime/contract change.
- Verify remaining gateway legacy admin routes before retiring the fallback.
- Verify AWS access and the existing frontend secrets (`AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_ADMIN`, and
  `AWS_S3_BUCKET_CLIENT`). Existing image publishing separately depends on
  `DOCKER_USERNAME` and `DOCKERHUB_TOKEN`.
- Confirm GitHub required-check/branch-protection settings do not still require
  the retired workflow/jobs; those external settings were not modified.
- Define Block 2 scope before implementing new pipeline or K3s deployment work.

The commit is local only; nothing is pushed or merged into `main`.
