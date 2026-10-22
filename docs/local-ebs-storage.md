# Local EBS file storage

The backend and evaluator share the same host directory, mounted at
`/data/files` in both containers. Permanent uploads are stored below
`/data/files/permanent`; disposable evaluation workspaces and checksum caches
are stored below `/data/files/evaluation-cache`.

Set `EBS_MOUNT_PATH` to the mounted EBS directory before starting Compose. The
evaluator entrypoint assigns the shared directory to UID/GID 1000 and then
drops to the non-root `appuser`. The backend runtime user also uses UID 1000,
so files written with directory mode `0750` and file mode `0640` are readable
by both services. The host mount must permit the container runtime to change
ownership on first start.

## Limits

`MAX_STORAGE_QUOTA_BYTES` limits permanent local storage (`0` means no
application quota), and `MIN_FREE_SPACE_BYTES` reserves free space. The
evaluator uses `EVAL_MAX_EXTRACTED_SIZE` and `EVAL_MAX_ARCHIVE_FILES` for
untrusted archives. `EVALUATION_CACHE_TTL_SECONDS` controls cleanup of the
evaluation cache only; permanent uploads are never removed by that cleanup.

## Existing records

The storage metadata migration preserves every `Resource.url` value and
classifies rows as `local`, `external`, `github`, or `r2`. Existing local keys
are recognized only when the corresponding file exists below `permanent`.
Unknown legacy keys are marked `r2` for explicit, temporary compatibility;
they are not silently interpreted as local files. External and GitHub URLs
remain URL resources.

Before removing R2 compatibility, verify that the `r2` row count is zero and
that every local row has a matching file and checksum where available.

Run the migration from `apps/backend_nest` with
`npm run migration:run` during deployment. It is intentionally not a database
reset and does not delete files or rows.

Storage readiness is exposed at `GET /health/storage` and reports existence,
readability, writability, and free-space status without returning the absolute
filesystem path.
