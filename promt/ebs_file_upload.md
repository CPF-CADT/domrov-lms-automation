Below are five independent development prompts. Each prompt tells the agent what to inspect, implement, preserve, and verify.

## Prompt 1 — Local EBS Storage Foundation

```text
Implement the local EBS storage foundation for this project.

Context:
The application will no longer use Cloudflare R2. Uploaded files must be stored on an EBS-mounted directory shared by the NestJS backend and code_eval containers.

Inspect first:
- apps/backend_nest/src/services/r2.service.ts
- apps/backend_nest/src/modules/file/file.service.ts
- apps/backend_nest/src/modules/file/file.module.ts
- apps/backend_nest/src/libs/entities/resource/resource.entity.ts
- docker-compose.yml

Implement:
1. Create a LocalStorageService or StorageService abstraction.
2. Use:
   LOCAL_FILE_ROOT=/data/files
3. Preserve the existing relative key format:
   - {userId}/{resourceType}/{parentId}/{filename}
   - Team{teamId}/submission/{submissionId}/{filename}
4. Convert keys to filesystem paths only inside the storage service.
5. Add functions:
   - saveFile(key, stream)
   - readFile(key)
   - fileExists(key)
   - deleteFile(key)
   - getFilePath(key)
6. Reject:
   - absolute paths
   - ../ traversal
   - null bytes
   - paths escaping LOCAL_FILE_ROOT
7. Use safe permissions. Never use chmod 777.
8. Update Docker Compose so backend and code_eval share the EBS-mounted directory.
9. Keep existing R2 files and code untouched temporarily for migration compatibility.

Constraints:
- Do not change assignment or submission behavior yet.
- Do not change the existing key format.
- Do not store absolute paths in PostgreSQL.
- Do not use user-provided paths directly.
- Do not delete existing files or database records.

Verification:
- Run the NestJS build.
- Add unit tests for valid keys, traversal attacks, absolute paths, file writes, reads, and deletes.
```

## Prompt 2 — NestJS Upload and Resource Linking

```text
Replace the active R2 upload flow with direct local EBS uploads in the NestJS backend.

Context:
LocalStorageService already exists or must be created. Files must be stored under LOCAL_FILE_ROOT. The existing resource key format must remain unchanged.

Inspect first:
- apps/backend_nest/src/modules/file/file.controller.ts
- apps/backend_nest/src/modules/file/file.service.ts
- apps/backend_nest/src/libs/entities/resource/resource.entity.ts
- apps/backend_nest/src/libs/entities/resource/assessment-resource.entity.ts
- apps/backend_nest/src/libs/entities/resource/submission-resource.entity.ts
- apps/backend_nest/src/modules/assessment/assessment.service.ts
- apps/backend_nest/src/modules/assessment/submission.service.ts
- apps/react-client/src/services/FileUploadService.ts

Implement:
1. Add:
   POST /file/upload
2. Accept multipart/form-data using FileInterceptor.
3. Require JWT authentication.
4. Validate:
   - file size
   - filename
   - extension
   - MIME type
   - parent resource access
5. Generate the existing relative key format.
6. Save files atomically to EBS.
7. Calculate:
   - file size
   - SHA-256 checksum
8. Create or update the Resource record.
9. Return:
   - resourceId
   - key
   - original filename
   - content type
   - size
   - checksum
10. Keep Resource.url temporarily compatible by storing the relative key there.
11. Add metadata fields if missing:
   - storageProvider
   - contentType
   - size
   - checksum
12. Update the download endpoint to read from local storage.
13. Verify resource ownership before attaching resources to assessments or submissions.
14. Keep GitHub URLs as external resources.
15. Keep the old R2 endpoints only as temporary compatibility endpoints.

Constraints:
- Never save absolute filesystem paths in the database.
- Never trust client-provided resource IDs without ownership validation.
- Do not manually construct file paths outside LocalStorageService.
- Do not delete existing R2 records.
- Do not change the existing resource key identity design.

Verification:
- Add unit and integration tests for upload, download, ownership, duplicate upload, invalid MIME type, oversized files, and path traversal.
- Run NestJS build and tests.
```

## Prompt 3 — Secure ZIP Extraction and Code Evaluation

```text
Update the code-evaluation system to read local EBS files and securely extract submissions.

Context:
The backend and code_eval containers share:

/data/files

Permanent uploads are stored under:

/data/files/permanent

Temporary evaluation files are stored under:

/data/files/evaluation-cache

The evaluator must stop downloading files from R2.

Inspect first:
- apps/backend_nest/src/modules/assessment/submission.service.ts
- apps/backend_nest/src/modules/evaluation/evaluation.controller.ts
- apps/backend_nest/src/libs/protos/submission.proto
- apps/code_eval/grpc_services/submission_servicer.py
- apps/code_eval/ai/llm/evaluation.py
- apps/code_eval/job_handler/tasks.py
- apps/code_eval/utils/extract_file.py
- apps/code_eval/utils/download_file_r2.py
- apps/code_eval/Dockerfile

Implement:
1. Return the actual linked submission resource key from NestJS.
2. Stop reconstructing keys using:
   `${submission.userId}/submission/${submission.id}`
3. Extend the gRPC response with:
   - storage_provider
   - storage_key
   - checksum
   - external_url
4. For LOCAL files, resolve storage_key under LOCAL_FILE_ROOT.
5. Remove R2 download logic from the active evaluation path.
6. Keep GitHub repository cloning supported.
7. Implement secure archive extraction using:
   - zipfile for ZIP
   - tarfile for TAR/TAR.GZ
8. Reject:
   - absolute archive paths
   - ../ traversal
   - extracted symlinks
   - excessive file count
   - excessive extracted size
9. Preserve the original uploaded archive.
10. Extract into a unique temporary evaluation directory.
11. Evaluate only the extracted copy.
12. Clean temporary files after success or failure.
13. Add checksum-based cache reuse where safe.
14. Prevent two evaluation jobs for the same submission from running simultaneously.
15. Remove chmod 777 and hard-coded /files_cache usage.
16. Never execute submitted code inside the NestJS container.

Constraints:
- Do not use patoolib unless all required external tools are explicitly installed and verified.
- Do not trust archive filenames.
- Do not allow extraction outside the evaluation directory.
- Do not modify permanent uploaded files.
- Do not expose absolute server paths through gRPC or HTTP.

Verification:
- Test ZIP extraction.
- Test malicious ZIP traversal.
- Test symlink rejection.
- Test file-count and size limits.
- Test local source-file evaluation.
- Test local ZIP evaluation.
- Test GitHub evaluation.
- Test cleanup after failure.
```

## Prompt 4 — React Upload Integration

```text
Update the React client to use the NestJS local EBS upload API.

Context:
The backend now accepts multipart uploads through:

POST /file/upload

The old browser-to-R2 presigned upload flow is no longer the active flow.

Inspect first:
- apps/react-client/src/services/FileUploadService.ts
- apps/react-client/src/services/FileService.ts
- apps/react-client/src/types/File.ts
- apps/react-client/src/pages/assignments/components/UploadSection.tsx
- apps/react-client/src/pages/assignments/components/CreateAssignmentForm.tsx
- apps/react-client/src/pages/assignments/components/EditAssignmentForm.tsx
- apps/react-client/src/pages/assignments/components/StudentPortal.tsx

Implement:
1. Replace the R2 upload flow with multipart upload to NestJS.
2. Send:
   - file
   - resourceType
   - resourceId
3. Support upload progress.
4. Return:
   - resourceId
   - key
   - filename
   - size
   - checksum
5. Update assignment resource uploads.
6. Update student submission uploads.
7. Preserve the existing resourceId-based linking logic.
8. Prevent duplicate uploads while an upload is in progress.
9. Display clear upload errors.
10. Keep download behavior using the backend resource ID.
11. Remove active calls to:
   - get presigned URL
   - upload directly to R2
   - notify R2 upload completion
12. Do not change Cloudinary image upload unless explicitly required.

Constraints:
- Do not rewrite unrelated pages.
- Do not change assignment or submission APIs unnecessarily.
- Do not store local filesystem paths in browser state.
- Do not bypass backend authentication.

Verification:
- Teacher can upload assignment resources.
- Student can upload ZIP files and source files.
- Progress works.
- Returned resource IDs are linked correctly.
- File download works.
- React build succeeds.
```

## Prompt 5 — Migration, Cleanup, Security, and Full Verification

```text
Finalize the local EBS file-storage migration and verify the complete system.

Context:
The system now uses local EBS storage instead of R2. Backend and code_eval share the same mounted storage directory.

Inspect first:
- all files changed by the previous storage, upload, and evaluation work
- apps/backend_nest/src/database/migrations
- docker-compose.yml
- apps/backend_nest/package.json
- apps/code_eval/Dockerfile
- apps/react-client/package.json

Implement:
1. Add or verify the database migration for:
   - storageProvider
   - contentType
   - size
   - checksum
2. Preserve existing Resource.url values as relative keys.
3. Add a migration strategy for existing records:
   - local file
   - external URL
   - GitHub URL
   - old R2 key
4. Add storage health checks:
   - EBS root exists
   - writable
   - readable
   - enough free space
5. Add configurable limits:
   - maximum file size
   - maximum storage quota
   - maximum extracted archive size
   - maximum archive file count
6. Add scheduled cleanup for evaluation-cache only.
7. Never delete permanent uploaded files during cache cleanup.
8. Add structured logging for:
   - upload
   - download
   - extraction
   - evaluation start
   - evaluation failure
   - cleanup
9. Ensure sensitive filesystem paths are not returned to clients.
10. Remove unused active R2 code only after compatibility is confirmed.
11. Update documentation and environment examples.
12. Verify Docker volume permissions for the non-root code_eval user.
13. Verify backend and code_eval use the same EBS mount.
14. Add end-to-end tests for:
   - teacher resource upload
   - student submission upload
   - file download
   - ZIP extraction
   - code evaluation
   - GitHub submission
   - unauthorized resource access
   - corrupted archive
   - insufficient disk space

Constraints:
- Do not use destructive database resets.
- Do not delete existing uploaded files without an explicit migration plan.
- Do not silently fall back to R2.
- Do not run uploaded code in the NestJS container.
- Do not mark the migration complete unless build, tests, and Docker checks pass.

Final verification:
- NestJS build passes.
- React build passes.
- Python tests pass.
- Integration tests pass.
- Docker Compose starts successfully.
- Files uploaded by the client are readable by code_eval.
- Evaluation uses local EBS files without R2 downloads.
```
