## Development Prompt 1 — Submission File Browsing Contract

```text
Inspect the existing React → NestJS → Python submission file-viewing flow.

Relevant files:
- apps/backend_nest/src/modules/evaluation/evaluation.controller.ts
- apps/backend_nest/src/modules/evaluation/evaluation.service.ts
- apps/backend_nest/src/modules/assessment/submission.service.ts
- apps/backend_nest/src/libs/protos/submission.proto
- apps/code_eval/grpc_services/submission_servicer.py
- apps/code_eval/utils/evaluation_workspace.py
- apps/react-client/src/services/EvaluationService.ts

Requirements:

1. Preserve Python as the owner of:
   - ZIP/TAR extraction
   - File-type handling
   - Folder-tree generation
   - File-content reading
   - Extraction caching

2. Preserve these NestJS endpoints:

   GET /evaluations/submission/:submissionId/folder-structure
   GET /evaluations/submission/:submissionId/file?file_path=...

3. Verify that teachers can access these endpoints through the existing submission permission guards.

4. Verify that:
   - File paths remain relative paths.
   - Absolute paths are never returned.
   - Storage keys and filesystem paths are never exposed to React.
   - Invalid or traversal paths are rejected.

5. Reuse the existing Python extraction cache.
6. Do not create a second cache in NestJS.
7. Do not rewrite Python file-type detection.
8. Do not move archive extraction into NestJS.

Return a stable response contract for:

- Folder structure
- Selected file content
- Relative file path
- File name
- File type

Add or update tests for:
- ZIP folder browsing
- File-content retrieval
- Invalid file paths
- Permission checks
- Existing extraction-cache reuse

Do not modify unrelated upload or evaluation logic.
```

## Development Prompt 2 — Reusable Read-Only Code Viewer

```text
Create a reusable React submission code viewer for teacher grading.

Relevant files:
- apps/react-client/src/services/EvaluationService.ts
- apps/react-client/src/types/Evaluation.ts
- apps/react-client/src/pages/assignments/components/GradeStudentsDetail.tsx

Create:

apps/react-client/src/pages/assignments/components/SubmissionCodeViewer.tsx

The component should contain:

- SubmissionFileTree
- SubmissionCodeEditor
- FeedbackPanel placeholder

Requirements:

1. Use @monaco-editor/react.
2. The editor must always be read-only.
3. Load the folder tree using getSubmissionFolderStructure().
4. Load file content lazily using getSubmissionFileContent().
5. Do not use resource.url as a browser URL.
6. Do not expose storage keys or filesystem paths.
7. Display code-focused files first.
8. Detect the Monaco language from the selected filename.
9. Show loading, empty, and error states.
10. Support selecting folders and files.
11. Preserve the selected relative file path.
12. Make the component reusable for:
    - Teacher view
    - Student view

Suggested props:

```ts
interface SubmissionCodeViewerProps {
  submissionId: number;
  feedbacks?: EvaluationFeedbackItemDto[];
  canComment?: boolean;
  showFeedback?: boolean;
}
```

Use the existing Python-backed APIs. Do not create new direct React-to-Python communication.

Integrate the component into GradeStudentsDetail.tsx without rewriting unrelated grading logic.

Verify:

- The file tree loads.
- Selecting a file loads its content.
- The editor is read-only.
- Multiple file types display correctly.
- Errors are shown clearly.
- The React build succeeds.

```

## Development Prompt 3 — Inline Feedback in Monaco

```text
Add inline feedback support to the reusable SubmissionCodeViewer component.

Relevant files:
- apps/backend_nest/src/libs/entities/assessment/evaluation-feedback.entity.ts
- apps/backend_nest/src/libs/dtos/submission/feedback-item.dto.ts
- apps/backend_nest/src/modules/assessment/submission.controller.ts
- apps/backend_nest/src/modules/assessment/submission.service.ts
- apps/react-client/src/services/SubmissionService.ts
- apps/react-client/src/types/Submission.ts
- apps/react-client/src/pages/assignments/components/SubmissionCodeViewer.tsx

Existing feedback fields:

```ts
{
  path: string;
  startLine?: number;
  endLine?: number;
  message: string;
  type: 'suggestion' | 'warning' | 'error';
}
```

Requirements:

1. Match feedback to the selected file using normalized paths.
2. Render feedback in Monaco using:
   - Whole-line decorations
   - Gutter markers
   - Hover messages
3. Support:
   - Single-line feedback
   - Multi-line feedback ranges
4. Use Monaco’s one-based line numbering.
5. Add a feedback panel showing comments for the selected file.
6. Allow teachers to:
   - Select a line or line range
   - Enter a message
   - Select feedback type
   - Save feedback
7. Keep the code editor read-only.
8. Do not allow teachers to modify submitted code.
9. Refresh decorations after feedback is created or updated.

Use the existing API:

```text
POST /submissions/:submissionId/feedback
```

Fix the update route to:

```text
PATCH /submissions/:submissionId/feedback/:feedbackId
```

Update the frontend service method accordingly.

Fix the backend guard so update requests validate:

```text
submission → evaluation → assessment → class → teacher permission
```

Do not rely on a guard that expects submissionId when the route only contains feedbackId.

Verify:

- Single-line decorations.
- Multi-line decorations.
- Correct file matching.
- Create feedback.
- Update feedback.
- Error, warning, and suggestion styles.
- Unauthorized users cannot modify feedback.

```

## Development Prompt 4 — Approval Visibility and Full Integration

```text
Integrate the submission code viewer into teacher and student workflows.

Relevant files:
- apps/react-client/src/pages/assignments/components/GradeStudentsDetail.tsx
- apps/react-client/src/pages/assignments/StudentAssignmentDetailPage.tsx
- apps/react-client/src/components/
- apps/backend_nest/src/modules/assessment/submission.service.ts
- apps/backend_nest/src/modules/assessment/submission.controller.ts
- apps/react-client/src/services/SubmissionService.ts
- apps/react-client/src/types/Submission.ts

Requirements:

Teacher view:

1. Teachers can open a submitted assignment.
2. Teachers can browse the submitted folder tree.
3. Teachers can view source files in Monaco.
4. Teachers can see existing inline feedback before approval.
5. Teachers can create and update inline feedback.
6. Teachers can still enter general score and feedback.
7. Teachers can approve the evaluation using the existing approval flow.

Student view:

1. Students can view their submitted code.
2. Students cannot edit the submitted code.
3. Students cannot create, update, or delete feedback.
4. Students must not see score or feedback before approval.
5. After approval, students can see:
   - Submitted code
   - Inline feedback
   - General feedback
   - Approved score

Use the existing evaluation approval state, especially isApproved.

Do not duplicate permission logic in React. The backend remains authoritative.

Backend requirements:

- Ensure unapproved evaluation feedback is not returned to students.
- Ensure approved feedback is returned with:
  - filePath
  - startLine
  - endLine
  - message
  - feedbackType
- Preserve existing teacher authorization.
- Preserve existing Python extraction and cache behavior.

Testing requirements:

- Teacher can browse submitted ZIP files.
- Teacher can view code.
- Teacher can add single-line feedback.
- Teacher can add range feedback.
- Teacher can update feedback.
- Student cannot modify feedback.
- Student cannot see unapproved feedback.
- Student can see approved inline feedback.
- Feedback appears only on its matching file.
- ZIP extraction cache is reused.
- NestJS tests pass.
- Python tests pass.
- React build succeeds.

Do not rewrite unrelated pages, upload behavior, AI evaluation behavior, or Python file-type handling.
```
