# DOMROV Frontend Feature Inventory

Analysis basis: source inspection of `apps/react-client` and `apps/admin`. Routes and behaviors are documented only where supported by source code.

## React Client

| ID | Application | Feature | Sub-feature | User Role | Route | Description |
|---|---|---|---|---|---|---|
| C-01 | Client | Public landing | Product sections and CTA | Public | `/` | Landing page with navigation and calls to action. |
| C-02 | Client | Documentation | Student, teacher, quiz, admin guides | Public | `/docs` | Documentation sections and sidebar navigation. |
| C-03 | Client | Informational pages | About, pricing | Public | `/about`, `/pricing` | Static informational and pricing views. |
| C-04 | Client | Authentication | Email login | User | `/login` | Login form calls `/auth/login`; successful login stores a token and loads `/users/me`. |
| C-05 | Client | Authentication | Sign-up and verification | Public | `/signup`, `/login/signup`, `/verify-email` | Registration, email verification, and resend-verification flows. |
| C-06 | Client | Authentication | Google OAuth callback | Public/authenticated | `/auth/callback` | Consumes OAuth callback state and refreshes a token. |
| C-07 | Client | Dashboard | Class listing and filters | Authenticated user | `/dashboard` | Lists classes, supports All/Active/End filters, join-class modal, and class navigation. |
| C-08 | Client | Classes | Create class | Teacher-capable user | `/classes/new` | Creates a class and navigates to its workspace. |
| C-09 | Client | Classes | Join class | Student/user | Dashboard modal | Joins by class code; refreshes the class list. |
| C-10 | Client | Class workspace | General tab | Student/teacher | `/classes/:classId/general` | Role-aware class overview and assignment summary. |
| C-11 | Client | Class workspace | Assignments tab | Student/teacher | `/classes/:classId/assignments` | Lists assignments, status filters, create/edit/view/grade actions. |
| C-12 | Client | Class workspace | Students tab | Teacher/staff | `/classes/:classId/students` | Displays class students. Protected by teacher-only route logic. |
| C-13 | Client | Class workspace | Teams tab | Teacher/staff | `/classes/:classId/teams` | Loads, creates, deletes, and manages class teams. |
| C-14 | Client | Assignments | Create and edit | Teacher | `/classes/:classId/assignments/new`, `.../:assignmentId/edit` | Draft creation, form update, resource upload, rubric editing, and publish. |
| C-15 | Client | Assignments | Student details and submission | Student | `/classes/:classId/assignments/:assignmentId` | Reads instructions, uploads resources, saves draft, submits, and views feedback. |
| C-16 | Client | Assignments | Teacher grading | Teacher | `.../:assignmentId/grade` | Loads assignment, tracking, roster, submission detail, and grading controls. |
| C-17 | Client | Files | Upload/download | Authenticated user | Assignment/class views | Uses presigned/upload notification and download APIs. |
| C-18 | Client | AI evaluation | Provider/key settings | Authenticated user | `/ai-evaluation` | Manages user AI keys/providers and evaluation-related settings. |
| C-19 | Client | Billing | Credit purchase | Authenticated user | `/creditPurchase` | Displays packages and payment/QR-related purchase flow. |
| C-20 | Client | Profile | User profile | Authenticated user | `/profile` | Loads and edits current profile through `/users/me`. |

## React Admin

| ID | Application | Feature | Sub-feature | User Role | Route | Description |
|---|---|---|---|---|---|---|
| A-01 | Admin | Authentication | Admin login/logout | Administrator/staff | `/login` | Uses `adminToken` and `adminUser` local storage entries. |
| A-02 | Admin | Dashboard | Statistics | Administrator | `/dashboard` | Loads dashboard statistics and recent activity. |
| A-03 | Admin | Users | Search/filter/pagination | Administrator/staff | `/user` (configured route) | Loads users, filters by status/role/search, and paginates. |
| A-04 | Admin | Users | User detail | Administrator/staff | `/users/:userId` | Displays a user and available account actions. |
| A-05 | Admin | Users | Status management | Administrator | Users page/modal | Activates/deactivates users with confirmation modal. |
| A-06 | Admin | Wallet | Add/deduct credits | Administrator | Users page/modal | Adds or deducts user credits with reason/input validation. |
| A-07 | Admin | Credit packages | CRUD/display | Administrator | `/packages` | Lists packages and uses package modal/table components. |
| A-08 | Admin | Transactions | Search/pagination/detail | Administrator | `/transactions` | Lists transactions and opens transaction detail modal. |
| A-09 | Admin | Evaluations | Usage logs | Administrator/staff | `/evaluations` | Lists AI usage/evaluation records with filters and pagination. |

## Cross-application dependencies

- Client authentication and Admin authentication both call the User Service but store tokens under different browser keys.
- Admin wallet changes are expected to affect user credit/payment views; this requires an integration test with the same user account.
- Admin evaluation/usage records are expected to correspond to client-triggered AI evaluations; this requires a real provider or controlled test fixture.
- Academic data created through the client is not currently represented by an equivalent admin academic page in the inspected admin routes.

## Incomplete, unclear, or inconsistent areas

- Admin route configuration uses `/user`, while the user-detail route uses `/users/:userId`; this should be confirmed as intentional.
- The admin API default includes `/api`; the client API default does not. Both `.env` files must be verified for the target environment.
- Several older client DTOs still describe academic IDs as numbers while the extracted academic service uses UUID strings; these are regression risks.
- Client grading UI depends on tracking and roster endpoints; these are backend dependencies and must be validated together.
- Some client routes are protected by authentication only; role protection is implemented inside pages/components and should be explicitly tested.
