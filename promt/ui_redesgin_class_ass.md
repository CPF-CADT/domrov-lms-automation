Below is the final version with UI design concepts, visual direction, layout details, sample text, and implementation requirements.

## Prompt 1 — Class Page UI Redesign

```text
Redesign the Domrov LMS class page and navigation.

Use the attached assignment screenshot as a visual reference for the overall style:

- Clean academic LMS interface
- White content cards
- Light gray page background
- Blue primary actions
- Blue active navigation state
- Clear page hierarchy
- Compact top header
- Consistent spacing and rounded corners

Do not copy the screenshot exactly. Use it only as design inspiration.

First inspect:

- apps/react-client/src/pages/classes/components/ClassSidebar.tsx
- apps/react-client/src/pages/classes/ClassDashboardPage.tsx
- apps/react-client/src/pages/dashboard/StudentDashboardPage.tsx
- apps/react-client/src/pages/dashboard/TeacherDashboardPage.tsx
- apps/react-client/src/pages/classes/components/ClassTabs.tsx
- apps/react-client/src/pages/classes/components/ClassNav.tsx

Current design problem:

The class page has two left navigation areas:

1. A narrow class shortcut rail
2. A wide module navigation sidebar

This creates too many columns and makes the main content feel compressed.

New UI concept:

Use a single left sidebar and one main content area.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Top header: breadcrumb, notifications, user profile     │
├────────────────┬─────────────────────────────────────────┤
│ Class sidebar  │ Main class content                      │
│                │                                         │
│ Class switcher │ Page title and actions                  │
│ Class name     │ Summary cards                           │
│ General        │ Main class information                   │
│ Assignments    │                                         │
│ Students       │                                         │
│ Teams          │                                         │
│ Grades         │                                         │
└────────────────┴─────────────────────────────────────────┘
```

Sidebar design:

- Width: approximately 240–280px
- White background
- Right border using `border-slate-200`
- Current class shown at the top
- Compact class switcher
- Navigation items with icons
- Active item:
  - Light blue background
  - Blue text
  - Blue left border indicator
- Hover state:
  - Light gray background
- Remove the existing separate `w-24` class shortcut rail.

Top header sample:

```text
Classes / Programming Fundamentals

Programming Fundamentals
Teacher view
24 students

[Manage class]
```

Main class page design:

- Page background: `bg-slate-50`
- Content max width: approximately 1100–1200px
- Use vertical sections instead of multiple side-by-side panels.
- Use white cards with:
  - `rounded-xl`
  - `border border-slate-200`
  - Light shadow
  - Consistent padding of 24px

Class overview card sample:

```text
Programming Fundamentals

Learn Java programming fundamentals through practical assignments
and hands-on exercises.

24 students
6 assignments
Session 1–12

[View assignments]
```

Navigation labels:

```text
General
Assignments
Students
Teams
Grades
```

Responsive behavior:

- Desktop: fixed left sidebar and scrollable main content.
- Tablet: reduce sidebar width and content padding.
- Mobile: convert sidebar into a drawer or collapsible menu.
- Do not create horizontal overflow.

Preserve:

- Existing routes
- Active route detection
- Teacher/student permissions
- Class switching
- Existing API calls
- Existing class data

Do not modify backend behavior.

Before implementation, inspect the current components and explain which layout classes will be replaced.

After implementation:

- Test teacher class navigation.
- Test student class navigation.
- Test active navigation states.
- Test class switching.
- Test mobile and tablet layouts.
- Run TypeScript build and lint.
- Report changed files and test results.

```


## Prompt 2 — Assignment Page UI Redesign

```text
Redesign the Domrov LMS assignment page for teachers.

Use the attached screenshot as visual inspiration:

- Strong page title at the top
- Breadcrumb navigation
- Clear primary action button
- White cards on a light gray background
- Blue buttons and status indicators
- Clearly separated form sections
- Comfortable spacing and readable labels

Do not copy the screenshot exactly. Improve the current design by removing the excessive multi-column layout.

First inspect:

- apps/react-client/src/pages/assignments/TeacherAssignmentDetailPage.tsx
- apps/react-client/src/pages/assignments/EditAssignmentPage.tsx
- apps/react-client/src/pages/assignments/components/EditAssignmentDetail.tsx
- apps/react-client/src/pages/assignments/components/ViewAssignmentDetail.tsx
- apps/react-client/src/pages/assignments/components/AssignmentHeader.tsx
- apps/react-client/src/pages/classes/components/AssignmentList.tsx
- apps/react-client/src/pages/classes/components/AssignmentCard.tsx

Current problem:

The assignment page uses a large main section and a separate right-side column. The information is fragmented and difficult to scan.

New UI concept:

Use one left class navigation column and one main vertical assignment column.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Breadcrumbs                         [Edit] [Submissions] │
├────────────────┬─────────────────────────────────────────┤
│ Class sidebar  │ Assignment header                       │
│                │ Status and metadata                     │
│                │ Overview                                │
│                │ Instructions                            │
│                │ Resources                               │
│                │ Submission settings                     │
│                │ Rubric                                  │
└────────────────┴─────────────────────────────────────────┘
```

Remove:

- Right-side `400px` or `420px` assignment columns
- Unnecessary split grids
- Duplicate page headers
- Excessive nested cards

Main content specifications:

- Max width: 900–1000px
- Page background: `bg-slate-50`
- Cards: white with light borders
- Section spacing: 24–32px
- Header actions aligned to the top right
- On mobile, stack all actions vertically

Assignment header sample:

```text
Classes / Programming Fundamentals / Assignments

Introduction to Java Programming

Published
Session 1

Due October 29, 2026 at 11:59 PM
100 points
File upload
Late submissions allowed

[Edit assignment] [View submissions]
```

Assignment overview card:

```text
Assignment overview

This assignment introduces students to Java variables,
data types, conditional statements, and loops.
```

Instructions section:

```text
Instructions

Create a Java program that demonstrates:

- Variables and data types
- Conditional statements
- Loops
- Basic input validation
- At least three test cases

Submit your completed Java source code before the due date.
```

Metadata section:

```text
Assignment details

Due date
October 29, 2026 at 11:59 PM

Maximum score
100 points

Submission method
File upload

Late submissions
Allowed
```

Resources section:

```text
Resources

Java Programming Guide.pdf
Reference material · PDF

[Open resource]
```

Rubric section:

```text
Grading rubric

Code correctness                         40 points
Code quality and readability             25 points
Input validation                         20 points
Test cases                               15 points
```

Use status styles:

- Published: green badge
- Draft: amber badge
- Past due: red badge
- Active: blue badge

Preserve:

- Assignment creation and editing
- Draft saving
- Publishing
- Deleting
- Resource management
- Team restrictions
- Rubric management
- Existing routes and permissions
- Existing API services and DTOs

Do not modify backend behavior.

Before implementation, inspect the current code and identify all existing split-column layouts.

After implementation:

- Test draft assignment display.
- Test published assignment display.
- Test edit action.
- Test view submissions action.
- Test resources.
- Test rubric.
- Test allowed teams.
- Test responsive layout.
- Run TypeScript build and lint.
- Report changed files and test results.

```


## Prompt 3 — Student Submission and Teacher Grading UI Redesign

```text
Redesign the Domrov LMS student submission and teacher grading screens.

Use the attached screenshot as visual inspiration:

- Clear header at the top
- Light gray background
- White content cards
- Strong blue primary action
- Clear status badges
- Form controls grouped into understandable sections
- One-column workflow instead of a crowded three-column layout

Do not copy the screenshot exactly.

First inspect:

- apps/react-client/src/pages/assignments/StudentAssignmentDetailPage.tsx
- apps/react-client/src/pages/assignments/AssignmentDetailPage.tsx
- apps/react-client/src/pages/assignments/components/StudentPortal.tsx
- apps/react-client/src/pages/assignments/components/UploadSection.tsx
- apps/react-client/src/pages/assignments/components/GradeStudentsDetail.tsx
- apps/react-client/src/pages/assignments/components/StudentEvaluationFeedback.tsx

Current problems:

- Student submission uses a sticky right-side panel.
- Teacher grading uses a three-column layout.
- Submission files, feedback, and grading controls compete for space.
- The workflow is difficult to understand.

New UI concept:

Use one left class navigation column and one main vertical content column.

Student page layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Breadcrumbs                         Submission status    │
├────────────────┬─────────────────────────────────────────┤
│ Class sidebar  │ Assignment title                       │
│                │ Instructions                            │
│                │ Resources                               │
│                │ Your submission                         │
│                │ Uploaded files                          │
│                │ Submit action                           │
│                │ Grade and feedback                      │
└────────────────┴─────────────────────────────────────────┘
```

Remove:

- Sticky `StudentPortal`
- Right-side submission column
- Three-column grading layout
- Repeated status cards

Student submission section:

```text
Your submission

Draft saved
Your progress is saved. You can continue editing before submitting.

Upload your work

Drag and drop your files here
or

[Choose files]

Accepted file types: .java, .zip
Maximum file size: 100 MB
```

Uploaded files:

```text
Uploaded files

Assignment1.java
24 KB

[View] [Remove]
```

Primary action:

```text
Ready to submit?

Make sure your files are complete before submitting.

[Submit assignment]
```

Submitted state:

```text
Assignment submitted

Your submission was received on October 27, 2026 at 4:35 PM.
Your instructor will review your work.

[Unsubmit assignment]
```

Graded state:

```text
Assignment graded

Score
87 / 100

Instructor feedback

Your solution meets most of the assignment requirements.
Improve input validation and add more edge-case tests.

This assignment is locked because grading is complete.
```

Teacher grading page layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Grade submissions                         [Refresh]      │
├──────────────────────────────────────────────────────────┤
│ Assignment summary                                      │
│ Total students | Submitted | Graded | Average score     │
├──────────────────────────────────────────────────────────┤
│ Search students                                         │
│ Student submissions table                               │
└──────────────────────────────────────────────────────────┘
```

Student table sample:

```text
Student submissions

Search students...

Student          Status              Score       Action
Dara Sok         Graded              87/100      [View]
Sopheak Lim      Pending evaluation  —           [View]
Mony Chan        Not submitted       —           [View]
```

Selected student detail layout:

```text
Dara Sok

Introduction to Java Programming
Submitted October 27, 2026 at 4:35 PM

Submission files

Assignment1.java
Java source file

[View file] [Download]

AI evaluation

Score: 87 / 100

The submission meets most assignment requirements.
Input validation is incomplete.

Teacher grade

Score
[87]

Teacher feedback
[Your feedback...]

[Save score changes]
[Approve and publish to student]
```

Use status colors:

- Draft saved: blue
- Submitted: blue or green
- Late: amber
- Pending evaluation: amber
- Graded: purple or green
- Approved: green
- Error: red

Preserve all existing behavior:

- File upload
- File removal
- GitHub or link submission
- Draft synchronization
- Submit assignment
- Unsubmit assignment
- Late submissions
- AI evaluation
- Manual grading
- Teacher feedback
- Approve and publish
- Locked state after approval
- Existing loading, success, and error states
- Existing API services, routes, permissions, and DTOs

Implementation requirements:

- Remove `grid-cols-3` from the grading detail layout.
- Remove `lg:grid-cols-[1fr_420px]` from the student assignment layout.
- Remove `sticky top-6` from the student portal.
- Stack content vertically.
- Use reusable section-card styling.
- Keep the main content width around 900–1000px.
- Make all layouts responsive.
- Do not change backend APIs.

Before implementation, inspect the existing code and explain the planned component changes.

After implementation:

- Test student draft state.
- Test file upload.
- Test file removal.
- Test submission.
- Test unsubmission.
- Test late submission state.
- Test grading state.
- Test AI feedback.
- Test manual score editing.
- Test approval and publishing.
- Test locked approved state.
- Run TypeScript build and lint.
- Report changed files and verification results.

```
