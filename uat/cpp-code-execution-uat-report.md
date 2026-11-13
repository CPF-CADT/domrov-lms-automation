# UAT Report: Student C++ Submission, Teacher Review, and Terminal Execution

Date: 2026-11-13
Environment: Local Docker Compose stack, gateway `http://localhost:3000`, React client `http://localhost:5173`

## Final status

**Not ready for stakeholder acceptance.**

The academic submission workflow can create, update, submit, and grade a C++ submission through the APIs. The Go sandbox works independently, including C++ compilation, compiler errors, and timeouts. However, the complete teacher-to-terminal workflow is blocked by two integration defects:

1. Teacher access to the submitted resource returns `403 Resource access denied`.
2. Academic-issued JWTs contain a numeric `sub`, while the Go service only accepts a string `sub`; execution result polling therefore returns `401 Authentication required`.

## Environment and implementation observed

- React client: student and teacher assignment views, read-only `SubmissionCodeViewer`, and `ExecutionTerminal`.
- Gateway: routes academic APIs and execution-result APIs.
- Academic service: owns classes, assignments, submissions, and resources in `academic_db`.
- Go code execution service: consumes `code.execution.requested` through RabbitMQ and stores job state in `execution_db`.
- Docker sandbox: temporary shared workspace, no network, resource limits, timeout, output capture, and cancellation.
- Local test accounts were isolated accounts created in the local Compose database. No credentials are included in this report.

## Executed test cases

| ID | Test | Result | Evidence |
|---|---|---|---|
| UAT-01 | Student authentication | PASS | `POST /auth/login` returned an access token for the isolated student account. |
| UAT-02 | Teacher authentication | PASS | `POST /auth/login` returned an access token for the isolated teacher account. |
| UAT-03 | Create class and enroll student | PASS | Teacher-created class returned a join code; student joined; both accounts listed the class. |
| UAT-04 | Create and publish coding assignment | PASS with workaround | Draft endpoint rejected the frontend-shaped request because `classId` is still required by validation even though it is present in the URL. Supplying `classId` in the body allowed creation. Update and publish succeeded. |
| UAT-05 | Upload `main.cpp` | PASS after environment setup | Initial upload failed with `EACCES: permission denied, mkdir '/data'` because the academic container had no writable local-storage mount. Creating the writable directory in the local test container allowed upload. |
| UAT-06 | Student save/update draft | PASS | Two draft saves succeeded with status `DRAFT`; the latest resource was selected. |
| UAT-07 | Student final submission | PASS | Final submit returned the submission ID and status `SUBMITTED`. |
| UAT-08 | Teacher roster identifies student/submission | PASS | Teacher roster returned the submission ID, student ID, status, and assignment relationship. |
| UAT-09 | Teacher retrieves submission metadata | PASS | Teacher submission endpoint returned the C++ submission metadata and `resourceId`. |
| UAT-10 | Teacher reads submitted source through file viewer API | FAIL | Folder and file endpoints returned `403 Resource access denied`. |
| UAT-11 | Teacher grades submission | PASS | Teacher grade endpoint persisted score `90`, feedback, grader ID, and status `GRADED`. |
| UAT-12 | Academic queues terminal execution | PASS | `POST /executions` returned an execution ID and `QUEUED`. |
| UAT-13 | Academic execution result polling | FAIL | `GET /execution-runs/:id` returned `401 Authentication required` because Go JWT parsing rejects numeric `sub` claims. |
| UAT-14 | Direct Go C++ execution | PASS | `g++ main.cpp -o main && ./main` returned stdout `Hello DOMROV!`, status `COMPLETED`, exit code `0`. |
| UAT-15 | Invalid C++ syntax | PASS | Returned `COMPILE_ERROR` with compiler output in `stderr`. |
| UAT-16 | Infinite loop | PASS | Returned `TIMEOUT` with `TIME_LIMIT_EXCEEDED` after approximately five seconds. |
| UAT-17 | Cross-user execution-result access | PASS | A different signed-in subject received `403 Execution access denied`. |
| UAT-18 | Stop running execution | PASS independently | Direct Go execution was cancelled and returned `CANCELLED_BY_USER`. |

## Defects

### DEF-CPP-001 — Teacher cannot read submitted resource

- Severity: High
- Reproducibility: 100%
- Steps: Submit a resource as a student; request `/evaluations/submission/{submissionId}/folder-structure` using the authorized teacher token.
- Expected: Teacher receives the submitted file tree and can view `main.cpp`.
- Actual: `403 Resource access denied`.
- Cause indicated by implementation: `getSubmissionForUser()` authorizes the teacher at the assignment level, but `getResourceStream()` applies resource-level ownership rules that only recognize the resource owner/submission owner, not the authorized instructor.
- Affected components: Academic service resource authorization, `SubmissionCodeViewer`, snapshot loading.

### DEF-CPP-002 — Go service rejects real NestJS JWT subject type

- Severity: Critical
- Reproducibility: 100%
- Steps: Queue execution through academic `POST /executions`; poll through gateway `/execution-runs/{id}`.
- Expected: Teacher receives execution status and terminal output.
- Actual: Polling returns `401 Authentication required`.
- Cause indicated by implementation: NestJS signs `sub` as a number; Go `claimsFromRequest()` unmarshals `sub` into a string and rejects the token.
- Affected components: Go JWT validation, academic-to-execution integration, terminal polling.

### DEF-CPP-003 — Local academic storage is not writable in Compose

- Severity: High
- Reproducibility: 100% on a fresh stack without manual preparation
- Steps: Upload a file through `/file/upload`.
- Expected: Resource is saved in local storage.
- Actual: `EACCES: permission denied, mkdir '/data'`.
- Cause indicated by implementation: `/data/files` is the default local storage path, but Compose does not provide a writable volume/directory for the non-root Node process.
- Affected components: Compose environment, academic local storage adapter, student upload workflow.

### DEF-CPP-004 — Frontend draft creation request conflicts with DTO validation

- Severity: Medium
- Reproducibility: 100%
- Steps: Use the frontend-shaped request `POST /assessments/class/{classId}/draft` with `{ "session": 1 }`.
- Expected: Draft assignment is created because the route already supplies `classId`.
- Actual: `400 classId must be a UUID`.
- Note: Supplying `classId` in the body made the request pass, but the existing frontend service does not send it.

## Coverage gaps and blocked tests

- Full browser student login and editor interaction were not marked PASS because no approved credentials for the newly created test accounts were entered into the browser. API workflow evidence was collected instead.
- Teacher browser review could not reach the submitted test class in the existing logged-in browser session; the API-backed review request was tested directly.
- The complete teacher terminal flow is blocked by DEF-CPP-001 and DEF-CPP-002.
- Large-output behavior, Java/Node/C language variants, and concurrent multi-job behavior were not executed in this UAT pass.

## Recommendations before rerun

1. Add instructor-aware resource authorization when a teacher is authorized for the submission's assignment/class.
2. Make Go JWT validation accept the numeric NestJS `sub` and normalize it to a string subject.
3. Mount a writable named volume or explicit host directory for academic `/data/files` in Compose, with correct UID/GID ownership.
4. Fix draft creation validation or update the frontend to send the required `classId` consistently.
5. Rerun UAT-10 through UAT-14 from the browser after the fixes; do not accept the feature based only on direct Go-service tests.

## Acceptance decision

The independent sandbox is functionally verified, but the complete student-to-teacher-to-terminal workflow is **blocked**. Stakeholder acceptance should wait until DEF-CPP-001 and DEF-CPP-002 are fixed and the complete flow is rerun with browser evidence.

## Retest addendum — 2026-11-13

The two original integration blockers were fixed and retested through the local gateway:

| Retest | Result | Evidence |
|---|---|---|
| DEF-CPP-001 teacher source access | PASS | Authorized teacher received HTTP 200 from `/evaluations/submission/{submissionId}/file` and the `main.cpp` source. |
| DEF-CPP-002 numeric JWT subject | PASS | Go normalized numeric `sub`/`teacherId` values to a string subject; polling authenticated successfully. |
| Academic → RabbitMQ → Go execution | PASS | `POST /executions` returned `QUEUED`; polling returned `RUNNING`, then `COMPLETED` with `Hello DOMROV!`. |
| Fresh Compose academic storage | PASS | Academic image now creates writable `/data/files` and Compose mounts the persistent `academic_files` volume. |

Additional implementation correction: the Go consumer now creates the execution job record when it receives an academic message. Previously academic created no row in `execution_db`, so valid worker results still appeared as `404 Execution not found`.

The remaining separate issue is DEF-CPP-004, the frontend draft request/DTO mismatch. Browser-level UAT is still not claimed as fully passed; the execution-path retest was performed through authenticated API calls in the local Compose environment.

## Retest addendum — draft creation

DEF-CPP-004 is fixed. `createAssessmentDraft()` now sends both the route `classId` and the body `classId`, satisfying backend validation. A local authenticated request returned HTTP 201 with a draft assignment, and the temporary test draft was deleted afterward. The React client production build also passed.

The assignment date and AI-setting contract was also aligned: create/edit forms now send `startAt`, `dueAt`, and `aiEvaluationEnabled`, matching the academic service DTO. Teacher assignment publishing now uses `dueAt` as well.

Submission downloads are now supported at `/file/submission/{submissionId}/download` with the same student/authorized-teacher access rules as source viewing. The local retest returned HTTP 200 with the submitted `main.cpp` content.

The React submissions URL is now registered in `App.tsx` and renders the existing teacher grading/submissions view. Before this fix, the backend APIs were healthy but the direct `/classes/{classId}/assignments/{assignmentId}/submissions` URL had no React route.

The execution terminal follow-up issues were also fixed: the submission viewer now uses a stable empty feedback array to prevent the React maximum-update-depth loop, and the gateway now handles local browser CORS preflight requests. An `OPTIONS /execution-runs/...` check returned HTTP 204 and an authenticated execution polling request returned HTTP 200.

The gateway also now removes duplicate upstream CORS headers before adding its local CORS policy. Browser UAT confirmed that the local student login succeeds and redirects to `/dashboard`.
