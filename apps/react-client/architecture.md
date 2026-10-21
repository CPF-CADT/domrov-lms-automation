# React Client Architecture

This document is the navigation guide for AI agents and developers working on the Domrov React client.

## 1. Project overview

The client is a Vite + React + TypeScript single-page application.

- Framework: React 19
- Build tool: Vite
- Routing: React Router
- Styling: Tailwind CSS
- HTTP client: Axios
- API base URL: `VITE_API_URL`
- Backend: NestJS in `../backend_nest`
- Authentication: `AuthContext`, access-token storage, and HTTP-only refresh-token cookie

The client is route-driven. Pages should read resource identifiers from the URL and fetch the resource from the backend. Do not use temporary page state as the source of truth for class, assignment, or submission identity.

## 2. Source tree

```text
src/
  pages/          Route-level screens and page-local components
  components/     Reusable UI shared by multiple domains
  services/       API calls and backend integration
  hooks/          Reusable React hooks
  context/        Application-wide React context
  lib/            Routing, storage, Axios, and other infrastructure helpers
  types/          TypeScript domain and API types
  config/         Static display configuration and constants
```

There are no feature barrel directories. Page-specific code is colocated under its route domain.

## 3. Page organization

```text
src/pages/
  auth/
    LoginPage.tsx
    SignupPage.tsx
    VerifyEmailPage.tsx
    OAuthCallbackPage.tsx
    components/

  landing/
  about/
  pricing/
  docs/
  billing/
  ai-evaluation/

  dashboard/
    DashboardPage.tsx
    StudentDashboardPage.tsx
    TeacherDashboardPage.tsx
    ProfilePage.tsx
    UserProfile.tsx
    components/

  classes/
    ClassDashboardPage.tsx
    CreateClassPage.tsx
    components/
    tabs/

  assignments/
    AssignmentDetailPage.tsx
    StudentAssignmentDetailPage.tsx
    TeacherAssignmentDetailPage.tsx
    CreateAssignmentPage.tsx
    EditAssignmentPage.tsx
    components/
```

### Placement rules

1. A component used by one page or route domain belongs beside that page in `src/pages/<domain>/components`.
2. Class dashboard tab screens belong in `src/pages/classes/tabs`.
3. A component used by multiple unrelated domains belongs in `src/components`.
4. API calls do not belong in page components; place them in `src/services`.
5. Do not create new `index.ts` barrel files. Import modules directly.

Example:

```tsx
import ClassSidebar from "@/pages/classes/components/ClassSidebar";
import submissionService from "@/services/SubmissionService";
import type { SubmissionViewerResponseDto } from "@/types/Submission";
```

## 4. Routing and URL resources

Routes are defined in `src/App.tsx`. Canonical resource routes are:

```text
/dashboard
/classes/:classId/general
/classes/:classId/assignments
/classes/:classId/students
/classes/:classId/teams
/classes/:classId/grades
/classes/:classId/assignments/new
/classes/:classId/assignments/:assignmentId
/classes/:classId/assignments/:assignmentId/edit
/classes/:classId/assignments/:assignmentId/grade
/profile
/creditPurchase
/ai-evaluation
```

Use route helpers from `src/lib/routes.ts` when creating links or redirects. Use `useParams()` to read IDs. A page must remain reload-safe: refreshing a URL should fetch the same resource again from the API.

Legacy routes in `App.tsx` redirect to canonical `/classes/...` routes. Keep them only for backward compatibility; new links must use canonical routes.

## 5. Class tabs

Class tabs are route-based, not only local component state:

```text
src/pages/classes/tabs/
  GeneralTab.tsx
  FilesTab.tsx
  StudentGeneralTab.tsx
  StudentAssignmentTab.tsx
  StudentGradesTab.tsx
  TeacherGeneralTab.tsx
  TeacherAssignmentTab.tsx
  TeacherGradesTab.tsx
  StudentsTab.tsx
  TeamsTab.tsx
```

The current user’s class role is resolved from the backend. Teacher-only tabs redirect students to the assignments tab.

## 6. Data and API flow

```text
Page
  -> page-local component or hook
  -> service in src/services
  -> Axios instance in src/lib/AxiosInstance.ts
  -> NestJS API
```

Important services include:

- `AuthService.ts` — login, refresh, profile authentication
- `ClassService.ts` — classes, members, class roles
- `AssessmentService.ts` — assignments and assessment details
- `SubmissionService.ts` — drafts, submissions, grading, resources
- `EvaluationService.ts` — code and AI evaluation endpoints
- `FileService.ts` / `FileUploadService.ts` — file uploads and resources
- `TeamService.ts` — team operations
- `UserService.ts` — profile and user operations

When adding an integration:

1. Add or update the TypeScript DTO in `src/types`.
2. Add the HTTP method to the relevant service.
3. Return the backend response in a typed form.
4. Call the service from a page or page-local hook.
5. Handle loading, error, and empty states.
6. Refresh or update the URL resource after a mutation.

Do not call `fetch` or Axios directly from many components when an existing service owns that endpoint.

## 7. Authentication

`src/context/AuthContext.tsx` owns the authenticated client state.

- Access-token state is kept through the storage utility.
- Refresh tokens are handled by the backend HTTP-only cookie.
- `ProtectedRoute` protects authenticated pages.
- `PublicRoute` prevents authenticated users from opening login pages.
- Google OAuth starts at `/auth/google/login` and returns to `/auth/callback`.

Do not add a second authentication state in a page component.

## 8. Storage

Use the storage utility in `src/lib/Storage.ts`. Do not call `localStorage` directly in new components.

Authentication keys are managed centrally. Assignment drafts are temporary and should be removed only after their backend replacement is verified.

## 9. Naming conventions

- Route screens: `PascalCasePage.tsx`
- Components: `PascalCase.tsx`
- Hooks: `useName.ts`
- Services: `NameService.ts` or `NameApi.ts`
- Types: `PascalCase.ts`
- Route parameters: `classId`, `assignmentId`, `submissionId`
- API methods: descriptive verbs such as `getSubmissionDetails`, `createAssessment`, or `updateProfile`

## 10. Adding a new page

1. Create the page under the correct `src/pages/<domain>/` folder.
2. Put page-only UI in that domain’s `components/` folder.
3. Add the route in `src/App.tsx`.
4. Add a route helper in `src/lib/routes.ts` if the URL is dynamic.
5. Add or reuse a service method for backend data.
6. Add loading, error, empty, and permission states.
7. Use direct imports; do not create an `index.ts` export file.
8. Run `npm run build` before finishing.

## 11. Local development

From this directory:

```bash
npm install
npm run dev
```

The Docker workflow from the repository root is:

```bash
docker compose up --build
```

The client is served at `http://localhost:5173` and the API at `http://localhost:3000`.

## 12. Validation checklist

Before submitting a change:

- Confirm the page is in the correct route folder.
- Confirm IDs come from the URL when they identify backend resources.
- Confirm API calls use a service.
- Confirm direct imports are used.
- Confirm refresh and direct-link navigation work.
- Run `npx tsc -b --force`.
- Run `npm run build`.
