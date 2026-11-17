# Academic Service CI readiness report

Validated on 2026-11-17 (Asia/Bangkok) in `CPF-CADT/domrov-lms-automation`,
branch `feat/local-infrastructure`, base HEAD
`232ed1cce1c02a5d9cc2719c208108263dde3b32`.

**Result: all five requested local checks PASS.** Lint, unit tests, and production
compilation also pass in an isolated Node 22 container. No image was published,
no deployment was performed, and the existing Compose environment was not restarted.
A remote GitHub Actions run and live database/broker integration were not performed.

## Root causes and fixes

1. **Missing ESLint 9 flat configuration.** The original assessment recorded
   ESLint 9.39.5 exiting 2 because no `eslint.config.*` existed. Added
   `eslint.config.mjs` with ESLint's recommended rules and TypeScript ESLint's
   recommended rules for every source and test TypeScript file. The approach
   follows the [official TypeScript ESLint flat configuration guide](https://typescript-eslint.io/getting-started/).
   `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars`
   remain enabled. The TypeScript recommended preset supplies the TypeScript
   replacement for the core unused-variable rule. No rule suppressions,
   `eslint-disable` directives, or non-blocking script changes were added.
2. **Missing TypeScript lint tooling and existing violations.** Added exact dev
   dependency versions `@eslint/js` 9.39.5 and `typescript-eslint` 8.73.0, with the
   compatible parser/plugin captured in `package-lock.json`. The latter declares
   ESLint `^8.57.0 || ^9.0.0 || ^10.0.0` and TypeScript `>=4.8.4 <6.1.0` peers,
   covering the existing ESLint 9.39.5 and TypeScript 5.9.3. Removed explicit `any`
   from submission creation, storage code, and test fixtures. Storage uses an
   `unknown` catch with property narrowing and Node stream/async iterable types;
   tests use record types, inferred repository maps, readonly provider tuples,
   property assignment, a real `RmqContext`, and a complete RabbitMQ envelope.
   Removed the unused assignment-save result and unused caught-error binding,
   preserving both the awaited save and the pending fallback.
3. **Docker dependency resolution differed from CI.** Both stages previously
   copied only `package.json` and ran `npm install`. Both now copy the committed
   lockfile and run `npm ci`, retaining `--ignore-scripts` and the runtime
   `--omit=dev` flag. Added `.dockerignore` for local dependencies, build output,
   coverage, Git metadata, environment files, logs, and incremental build files.
   Existing package versions were compared to HEAD: **none were upgraded or
   removed**; only lint tooling and its required packages were added.

## Inspection and integration safety

Reviewed package metadata and lockfile, TypeScript configurations, embedded Jest
configuration, controllers, service, DTOs, entities, storage, authentication,
RabbitMQ publisher/consumer interfaces, Docker inputs, the prior readiness report,
and `.github/workflows/microservice-images.yml`.

- The centralized workflow already selects Academic, uses Node 22, runs `npm ci`,
  lint, tests, and production build, and gates Docker construction with
  `needs: validate`. Academic's lint script remains present and blocking;
  the workflow's existing `--if-present` still executes it. No workflow edit
  was required. Image publication remains an explicit, default-false input.
- Controllers, REST paths, response structures, DTO decorators and validation,
  authentication, RabbitMQ event names and production payloads are unchanged.
  No production messaging implementation was edited.
- Entities, schema definitions, datasource configuration, and migrations are
  unchanged. No database access, migration execution, or production data change
  was performed.
- The runtime still uses `node:22-alpine`, `NODE_ENV=production`, working directory
  `/app`, user `node`, exposed port 3002, and `node dist/src/main.js`. Image
  inspection confirmed these settings. The data-directory creation and ownership
  instructions and the inherited Node image entrypoint remain unchanged.
- `tsconfig.json`, `tsconfig.build.json`, Jest settings, and application dependency
  versions remain unchanged. The strict compiler configuration and Nest decorator
  metadata settings are preserved.

## Exact validation results

All five commands below were executed from `apps/backend/academic`. Each final
execution returned the exit code shown. Logs were captured with shell `pipefail`
so a failing command cannot be hidden by `tee`.

Host environment: Node **v24.22.2**, npm **11.19.1**.

| Command | Exit code | Actual result | Local log |
|---|---:|---|---|
| `npm ci` | 0 | Added 759 packages; audited 760 packages. | `/tmp/academic-ci-npm-ci.log` |
| `npm run lint` | 0 | All source/test TypeScript files pass with no diagnostics. | `/tmp/academic-ci-lint.log` |
| `npm test` | 0 | 4 suites, 13 tests passed; 0 snapshots; 15.399 seconds. | `/tmp/academic-ci-test.log` |
| `npm run build` | 0 | `nest build` completed. | `/tmp/academic-ci-build.log` |
| `docker build -t domrov-academic-service:ci-test .` | 0 | Local production image constructed successfully. | `/tmp/academic-ci-docker-build.log` |

Selected actual output:

```text
$ npm ci
added 759 packages, and audited 760 packages in 17s

$ npm run lint
> eslint "src/**/*.ts" "test/**/*.ts"

$ npm test
Test Suites: 4 passed, 4 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        15.399 s
Ran all test suites.

$ npm run build
> nest build

$ docker build -t domrov-academic-service:ci-test .
#15 naming to docker.io/library/domrov-academic-service:ci-test done
#15 unpacking to docker.io/library/domrov-academic-service:ci-test done
#15 DONE 0.1s
```

The first Docker build actually executed both install layers and compilation:
759 build packages and 271 runtime packages were installed, and `nest build`
completed in the Node 22 stage. A repeat after the clean host validation passed
using those cached layers. One intervening sandbox invocation returned **1**
because it could not access `/var/run/docker.sock`; retrying with Docker socket
permission returned **0**. This was an execution-permission issue, not a
Dockerfile failure. No command with a nonzero result is counted as a pass.

Confirmed `dist/src/main.js`, `dist/src/database/data-source.js`, and all five
compiled migration JavaScript files exist. An additional `npx tsc --noEmit`
check returned 0 and covered source and tests (the production build excludes tests).

## Node 22 verification

Built the existing Docker build stage as a local validation image:

```bash
docker build --target build -t domrov-academic-service:ci-validation .
```

Exit code: **0**. Then ran a disposable container using that stage's installed
dev dependencies and source. The current `test` directory and ESLint configuration
were mounted read-only. The container had `--network none`, ran validation only,
and was removed automatically with `--rm`; it did not start the application.

```bash
docker run --rm --network none \
  --mount type=bind,src=/home/panha/devops/domrov-lms-automation/apps/backend/academic/test,dst=/app/test,readonly \
  --mount type=bind,src=/home/panha/devops/domrov-lms-automation/apps/backend/academic/eslint.config.mjs,dst=/app/eslint.config.mjs,readonly \
  --entrypoint sh domrov-academic-service:ci-validation \
  -c 'set -e; node --version; npm --version; npm run lint; npm test; npm run build'
```

Exit code: **0**. Node **v22.23.4**, npm **10.9.9**. Lint passed, all four test
suites and 13 tests passed (17.37 seconds), and `nest build` passed. With `set -e`
and the successful final container exit, each of these validation commands
returned 0. Full output: `/tmp/academic-ci-node22.log`.

Passing suites:

- `test/academic.parity.spec.ts`: dashboard, evaluation lookup, class join,
  rubric validation/publishing, and grading (5 tests).
- `test/academic.service.spec.ts`: submission persistence before asynchronous
  evaluation and pending fallback on boundary failure (2 tests).
- `test/storage.spec.ts`: local save/head/stream, traversal rejection, upload
  notification metadata, and local upload URL (4 tests).
- `test/rabbitmq.spec.ts`: requested-event envelope and completed-event application
  plus acknowledgement (2 tests).

## Changed files for review

Paths are repository-relative. These are the complete task changes:

| File | Change |
|---|---|
| `apps/backend/academic/eslint.config.mjs` (new) | ESLint 9 flat recommended configuration. |
| `apps/backend/academic/package.json` | Two lint dev dependencies; scripts unchanged. |
| `apps/backend/academic/package-lock.json` | Locked lint tooling; existing versions preserved. |
| `apps/backend/academic/src/academic.service.ts` | Removed unnecessary `any` and unused bindings. |
| `apps/backend/academic/src/storage.ts` | Narrowed filesystem errors; explicit stream types. |
| `apps/backend/academic/test/academic.parity.spec.ts` | Inferred repositories, typed records and provider tuples. |
| `apps/backend/academic/test/academic.service.spec.ts` | Typed records and provider tuples. |
| `apps/backend/academic/test/storage.spec.ts` | Removed explicit `any` fixture assignments. |
| `apps/backend/academic/test/rabbitmq.spec.ts` | Real RMQ context and valid envelope fixture. |
| `apps/backend/academic/Dockerfile` | Lockfile-based `npm ci` in both stages. |
| `apps/backend/academic/.dockerignore` (new) | Excludes generated and local files from context. |
| `docs/ACADEMIC_CI_READINESS_REPORT.md` (previously untracked) | Replaced blocked assessment with actual fixes and validation evidence. |

The report was already untracked when this task began. Its previous contents were
saved locally as `/tmp/academic-ci-readiness-before.md` before updating it.

Pre-existing Payment changes (`package.json`, `package-lock.json`, and untracked
`eslint.config.mjs`) were preserved. The tracked Payment diff was compared
byte-for-byte with its initial snapshot; the untracked file's SHA-256 also matched.
No other microservice was modified. Nothing was staged, committed, or pushed.

## Remaining issues and limits

No blocker remains for the five requested checks. Existing non-fatal notices remain:

- ts-jest emits `TS151002` for Node16 hybrid modules without `isolatedModules`.
  Tests pass on both checked Node versions. Compiler/Jest behavior was left
  unchanged; diagnostics were not suppressed.
- npm reports **20 moderate advisories** for the complete install and **3 moderate
  advisories** for the production Docker install, plus deprecation notices.
  ESLint 9 also emits its upstream support deprecation notice. No audit-driven
  or major-version dependency upgrade was attempted within this scoped task.
- Host npm emits the existing `@parcel/watcher` install-script approval notice.
  Installation and compilation still succeed.
- The existing `.env.example` omits required `RABBITMQ_URL`; it was left unchanged.
  Runtime requires externally supplied database and broker settings. Live
  PostgreSQL/RabbitMQ/R2 connectivity, migrations, application startup, and remote
  GitHub Actions execution remain unverified by these unit/build checks.

Both Docker tags created here are local only. Publication and deployment were
outside scope and were not performed.
