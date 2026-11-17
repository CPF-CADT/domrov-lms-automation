# Academic dependency security review

Reviewed: 2026-11-17. Repository: `CPF-CADT/domrov-lms-automation`.
Branch: `feat/local-infrastructure`. Scope: `apps/backend/academic`.

## Decision: open for release security review

No patched dependency upgrade within the current supported semver ranges was
available at review time. Preserve the working dependency manifest and lockfile;
do not force a TypeORM upgrade or transitive major-version override. This review
does not remediate or accept the vulnerabilities. Release security review must
decide whether the documented exposure is acceptable before release.

## Root cause and advisories

The reproducible production dependency path is:

```text
domrov-academic-service
└── typeorm@0.3.31 (manifest: ^0.3.28)
    └── glob@10.5.0 (TypeORM requires ^10.5.0)
        └── minimatch@9.0.9 (glob requires ^9.0.4)
```

| Advisory | Affected versions | First patched version | Exposure condition |
| --- | --- | --- | --- |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | glob >=9.0.0, <=14.0.1 | 14.0.2 | Missing returns after abort callbacks allow filesystem traversal to continue after cancellation. Exploitation requires attacker-influenced patterns or directory trees and reliance on AbortSignal cancellation as a work budget. |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | minimatch >=7.0.0, <11.0.1 | 11.0.1 | Attacker-controlled patterns can amplify globParts during preprocessing at optimizationLevel >=2, followed by quadratic comparison work, consuming CPU and memory. |

These are two underlying availability advisories. npm reports three moderate
package findings because the transitive impact also flags TypeORM; this is not
three independent advisories. No confidentiality or integrity impact is claimed
by these advisories.

## Supported versions and options evaluated

Live npm registry queries (`npm view`) returned:

| Package | Registry evidence | Decision |
| --- | --- | --- |
| TypeORM 0.3.x | Latest stable 0.3.x and `legacy` tag: 0.3.31. Versions 0.3.28 through 0.3.31 all require glob ^10.5.0. | Already at the newest stable 0.3.x; no newer patch release fixes the chain. |
| glob 10.x | Highest published 10.x and `legacy-v10` tag: 10.5.0. npm deprecates this version and describes old glob versions as unsupported. | No patch/minor fix within ^10.5.0. glob 11, 12 and 13 are also inside the affected range. |
| minimatch 9.x | Highest published 9.x and `legacy-v9` tag: 9.0.9. | No patch/minor fix within ^9.0.4. Version 10 is also affected. |
| glob 14.0.2 / minimatch 11.0.1 | First patched versions; both declare Node 18, 20 or >=22. Current latest tags: glob 14.0.6 / minimatch 11.0.9. | Node 22 support alone does not prove compatibility with TypeORM's declared dependencies. Both require major-version overrides outside their parents' supported ranges; compatibility was not established, so none was applied. |
| TypeORM 1.1.3 | Current `latest`; npm audit suggests it as a semver-major fix. Its dependencies use tinyglobby ^0.2.17 instead of glob. Requires Node ^20.19.0, ^22.13.0 or >=24.11.0. | Candidate for a separately validated migration, not a patch/minor remediation. |

The installed `@nestjs/typeorm@11.0.3` declares the TypeORM peer range
`^0.3.0 || ^1.0.0-dev`; `semver.satisfies('1.1.3', range)` returned true.
There is no demonstrated NestJS peer conflict. However, TypeORM's
[v1 release notes](https://github.com/typeorm/typeorm/releases/tag/1.0.0)
explicitly document breaking changes. A peer match does not establish repository,
query, entity or migration behavior compatibility. No TypeORM downgrade was
attempted: selecting older ORM behavior is not a verified security fix.

## Reachability in Academic

Source inspection found no direct glob/minimatch calls or attacker-supplied glob
patterns in `src`. The reviewed entry points are HTTP controllers, RabbitMQ
handlers, resource storage, and submission snapshot reading.

- `src/app.module.ts` passes eight imported entity classes to TypeORM. It does
  not configure string entity patterns, subscribers or migration discovery.
- `src/database/data-source.ts` passes the same eight classes and five explicitly
  imported migration classes to the migration CLI. Database configuration and
  `synchronize: false` remain unchanged.
- TypeORM 0.3.31's `connection/ConnectionMetadataBuilder.js` splits classes from
  string directory patterns. `util/DirectoryExportedClassesLoader.js` calls
  `glob.sync` only while reducing those string patterns; empty arrays perform
  no glob traversal. The loader supplies no AbortSignal.
- The installed glob 10.5.0 sets minimatch's `optimizationLevel` to 2. Therefore
  the minimatch issue would matter if untrusted patterns reached this loader;
  synchronous traversal alone does not remove that risk.
- `src/storage.ts` uses explicit validated storage paths and direct filesystem
  operations. `src/execution.controller.ts` reads ZIP entries in memory; neither
  uses globbing. Uploaded filenames, storage keys and ZIP entry names are not
  used as TypeORM discovery patterns in the reviewed code.

A disposable container from the rebuilt final image ran an instrumented check
with networking disabled. It intercepted glob/minimatch function calls and would
fail on any invocation. It loaded the actual NestJS TypeORM options factory and
the exported migration configuration, then built metadata without connecting to
PostgreSQL:

| Configuration | Entity metadata | Migrations | glob/minimatch calls | Database connected |
| --- | --- | --- | --- | --- |
| Service | 8 | 0 | 0 | No |
| Migration CLI | 8 | 5 | 0 | No |

Assessment: no exploitable path for these advisories was identified in the
reviewed Academic runtime behavior. The packages are imported by TypeORM and
remain installed; this is a bounded exposure assessment, not proof of universal
unreachability. Live database startup, migrations and HTTP integration were not
executed during this review.

## Verification and actual counts

Commands ran in `apps/backend/academic` except the Docker build, which ran at the
repository root. Dependencies and the lockfile were unchanged before and after.
Host tooling: Node v24.22.2, npm 11.19.1. Docker stages use `node:22-alpine` and
npm 10.9.9.

| Check | Exit code | Actual result |
| --- | --- | --- |
| `npm audit --omit=dev --json` before | 1 | 3 moderate; 0 info, low, high or critical; total 3 |
| `npm ci --cache /tmp/academic-security-npm-cache` | 0 | 759 packages added; 760 audited; install summary: 20 moderate findings including development dependencies |
| `npm run lint` | 0 | Passed |
| `npm test` | 0 | 4 suites passed; 13 tests passed; 0 snapshots |
| `npm run build` | 0 | Passed |
| `npm audit --omit=dev --json` after | 1 | 3 moderate; 0 info, low, high or critical; total 3 |
| `docker build --progress=plain --no-cache -t domrov-academic-security-review:local apps/backend/academic` | 0 | Build and runtime stages rebuilt successfully; runtime npm install reports 3 moderate findings; build-stage install reports 20 moderate findings |
| Final-image inventory and instrumented metadata check | 0 | Exact vulnerable production versions present; metadata checks above passed; Jest and Nest CLI absent from /app/node_modules |

Initial sandboxed registry access and `npm ci` failed with `EAI_AGAIN` (exit 1);
the successful installation and audits above used approved network access.
The clean install emitted an npm 11 install-script policy notice for
`@parcel/watcher@2.6.0`; lint, tests and build still passed. The existing Dockerfile
uses `--ignore-scripts` in both install stages.

Image manifest-list digest:
`sha256:b6f474795f3771b09495b71b7ffb13066c99c571764650b62181a16e90a1e921`.
Resolved base-image digest:
`sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202`.

The final runtime stage executes `npm ci --omit=dev --ignore-scripts`. The
actual rebuilt image contains:

```text
/app/node_modules/typeorm/package.json                         0.3.31
/app/node_modules/typeorm/node_modules/glob/package.json      10.5.0
/app/node_modules/typeorm/node_modules/minimatch/package.json  9.0.9
```

Production-only installation does not remove these production dependencies.
The disposable inspection container did not start the service, publish ports,
mount service volumes, or connect to a database. No existing container was
restarted, and no image was published.

Local raw evidence from this run is retained in `/tmp/academic-security-*`:
`audit-before.json`, `audit-after.json`, `npm-ci.log`, `lint.log`, `test.log`,
`build.log`, `runtime-inspect.cjs`, and `runtime-inspect.log` (each with the
`academic-security-` prefix). These temporary files are not repository changes.

## Residual risk and follow-up

Keep both advisories and all three production findings open for release security
review. Current low exposure does not remove the vulnerable packages or change
their scanner status. Reassess immediately if TypeORM discovery switches to
string patterns, user-controlled patterns are introduced, or filesystem globbing
is added over uploaded content.

Monitor for an upstream 0.3.x release/backport that supports patched dependencies.
If none arrives, plan a TypeORM 1.x migration following its upgrade guide, with
PostgreSQL integration checks for repositories, transactions and query behavior,
plus migration run/revert against a disposable database and a fresh final-image
audit. A maintained, reviewed backport is another possible future option; no
local vendored patch or major override was introduced here.

Preserve explicit entity/migration classes and keep request data out of discovery
patterns. If untrusted globbing is ever required, validate and bound patterns and
directory access, and use process-level resource/time limits; AbortSignal alone
is insufficient for the affected glob versions. These are recommendations, not
new controls implemented in this change.

## Changed files and safety

The only repository change from this review is this document:
`apps/backend/academic/DEPENDENCY-SECURITY-REVIEW.md`.

Academic's package manifest, lockfile, Dockerfile, application source, migrations,
entities, repositories and database configuration are unchanged. Jest was not
downgraded. No forced audit fix, deployment, commit or push was performed. User,
Payment and Evaluation were not modified. Existing Payment changes were preserved
byte-for-byte, including its untracked ESLint configuration.
