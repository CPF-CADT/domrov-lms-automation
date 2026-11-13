# UAT Test Cases

These cases are derived from the scenarios. Sensitive values are placeholders.

| Test Case ID | Scenario | Objective | Preconditions | Test Data | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| TC-01 | S-01 | Verify login | Gateway and client available | `<valid_user_email>`, `<valid_password>` | Open `/login`; enter credentials; submit. | Dashboard opens; token/profile are stored; no error banner. | Critical |
| TC-02 | S-02 | Verify login validation | Login page open | Empty, malformed, wrong password | Submit each input set. | Client validation or API error is shown; no dashboard access. | High |
| TC-03 | S-03 | Verify Google OAuth | OAuth callback configured | Test Google account | Click Google; complete provider flow. | Callback returns to client and authenticated dashboard opens. | High |
| TC-04 | S-06 | Verify class creation | Authenticated teacher | Unique class name | Dashboard → Create Class → fill fields → submit → open class. | Class appears once; UUID route opens; role is Teacher. | Critical |
| TC-05 | S-07 | Verify class joining | Student authenticated; class exists | `<valid_join_code>` | Dashboard → Join Class → enter code → submit. | Class appears for student; duplicate join is rejected safely. | Critical |
| TC-06 | S-08 | Verify permissions | Teacher and student accounts | Existing class | Open student class route; attempt Students/Teams/Grade actions. | Student sees allowed views only; protected APIs reject unauthorized actions. | High |
| TC-07 | S-09 | Verify assignment lifecycle | Teacher enrolled in class | Title, instruction, score, due date | Open Assignments → Create → save draft → edit → publish. | Draft and published states persist and appear in the list. | Critical |
| TC-08 | S-10 | Verify assignment validation | Create form open | Missing title/instruction/score/due date | Submit invalid combinations. | Required/format/business validation prevents invalid publish. | High |
| TC-09 | S-12 | Verify submission | Published assignment; student enrolled | Test file/resource | Open assignment → upload → save draft → submit. | Submission status changes and resource is listed. | Critical |
| TC-10 | S-13 | Verify grading | Submission exists; teacher account | Score `87`, feedback text | Open Grade → select student → save grade. | Grade and feedback persist; status becomes graded. | Critical |
| TC-11 | S-14 | Verify grade privacy | Graded submission exists | Student account | Open student submission; request another user's submission URL. | Own grade is visible; other user's data is denied. | High |
| TC-12 | S-15 | Verify file access | Resource exists | Valid and invalid resource IDs | Upload/download; try unauthorized download. | Valid file works; failures are surfaced; unauthorized access is rejected. | High |
| TC-13 | S-17 | Verify payment | Payment provider/test integration available | Test package/payment | Select package; complete payment; refresh wallet. | Correct pending/success/failure state and balance update. | High |
| TC-14 | S-18 | Verify admin access | Admin app available | `<admin_account>` and `<non_admin_account>` | Login with both accounts. | Admin enters dashboard; non-admin is denied or redirected. | Critical |
| TC-15 | S-20 | Verify user management | Admin authenticated; users exist | Search term/status/role/page | Search, filter, paginate, open detail, change status. | Results and status remain consistent after refresh. | High |
| TC-16 | S-21 | Verify wallet administration | Admin authenticated; user exists | Amount, reason | Add credits; deduct credits; inspect transaction. | Balance and transaction reflect exactly one operation. | High |
| TC-17 | S-23 | Verify transactions | Wallet action completed | User/date/status filters | Open Transactions; filter and open row. | Transaction details match the wallet operation. | High |
| TC-18 | S-24 | Verify evaluations | Evaluation records/provider available | Status/date filters | Open Evaluations; filter; open detail/log. | Status and usage data load correctly. | Medium |
| TC-19 | S-25 | Verify cross-app state | Same user exists in both apps | Admin credit/status change | Change user in Admin; refresh Client. | Client reflects new state without stale false success. | High |
| TC-20 | S-27 | Verify API failure handling | Ability to stop/mock API | 401, 404, 500, timeout | Trigger each failure during a workflow. | UI shows actionable error, preserves input where reasonable, and does not claim success. | High |
