# UAT Scenarios

| ID | App | Feature | Role | Scenario | Priority |
|---|---|---|---|---|---|
| S-01 | Client | Email login | User | Valid credentials open dashboard. | Critical |
| S-02 | Client | Login validation | Public | Empty, malformed, and invalid credentials show validation/error feedback. | High |
| S-03 | Client | OAuth | Public | Google login completes with the configured local callback. | High |
| S-04 | Client | Sign-up | Public | Valid sign-up leads to verification; duplicate/invalid email is rejected. | High |
| S-05 | Client | Dashboard | User | Classes load, empty state appears when no classes exist, filters work. | High |
| S-06 | Client | Class creation | Teacher | Valid class is persisted and opens with the correct role. | Critical |
| S-07 | Client | Class joining | Student | Valid code joins once; invalid/duplicate code gives a useful error. | Critical |
| S-08 | Client | Class permissions | Student/teacher | Student cannot use teacher-only Students/Teams/grading actions. | High |
| S-09 | Client | Assignment creation | Teacher | Draft can be created, edited, saved, and published. | Critical |
| S-10 | Client | Assignment validation | Teacher | Missing title/instructions/score/due date is rejected before publish. | High |
| S-11 | Client | Assignment list | Student/teacher | Published/draft filters and assignment navigation use UUIDs correctly. | High |
| S-12 | Client | Submission | Student | Student can upload, save draft, submit, and see submission status. | Critical |
| S-13 | Client | Grading | Teacher | Teacher can view roster/submission, grade, and save feedback. | Critical |
| S-14 | Client | Grade visibility | Student | Student sees only their own graded submission and feedback. | High |
| S-15 | Client | Files | Student/teacher | Upload/download failure states are visible and no unauthorized file is exposed. | High |
| S-16 | Client | AI settings | User | Provider/key create/update/delete and error states work. | Medium |
| S-17 | Client | Payment | User | Purchase flow shows pending/success/failure and refreshes balance. | High |
| S-18 | Admin | Login/authorization | Admin/staff | Valid admin account enters admin dashboard; invalid/non-admin is denied. | Critical |
| S-19 | Admin | Dashboard | Admin | Statistics and recent activity load with loading/empty/error states. | High |
| S-20 | Admin | Users | Admin/staff | Search, filter, pagination, detail, and status changes work. | High |
| S-21 | Admin | Wallet | Admin | Add/deduct credit validates amount/reason and creates visible transaction. | High |
| S-22 | Admin | Packages | Admin | Package listing/modal behavior matches available API operations. | Medium |
| S-23 | Admin | Transactions | Admin | Filters, pagination, and transaction details remain consistent after wallet action. | High |
| S-24 | Admin | Evaluations | Admin/staff | Evaluation logs filter and display status/details. | Medium |
| S-25 | Both | User-to-admin consistency | User/admin | Admin wallet/status change is reflected in client after refresh. | High |
| S-26 | Both | Evaluation consistency | User/admin | Client evaluation activity is represented in admin evaluation/usage views. | Medium |
| S-27 | Both | API outage | User/admin | 4xx/5xx/network failure produces usable UI feedback and no false success. | High |
| S-28 | Both | State consistency | User/admin | Refresh, back navigation, repeated submit, and duplicate actions do not corrupt state. | High |
