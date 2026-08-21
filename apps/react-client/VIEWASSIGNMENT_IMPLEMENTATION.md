# ViewAssignment Page Implementation

## Overview
Created a complete ViewAssignment page that allows teachers to view assignment details and student submissions.

## Files Created

### 1. Mock Data (`/src/data/mockAssignmentDetails.ts`)
- **StudentSubmission** interface: Student data structure with submission and AI analysis status
- **AssignmentDetailsData** interface: Assignment details and students array
- **mockAssignmentDetails**: Sample data with 12 students showing various submission statuses
- **getAssignmentStats()** function: Helper to calculate total, submitted, and missing submission counts

#### Data Structure:
```typescript
{
  assignment: {
    id: string,
    title: string,
    description: string,
    dueDate: string
  },
  students: [
    {
      studentId: string,
      name: string,
      submissionStatus: "submitted" | "missing",
      submissionTime?: string,
      aiStatus: "checked" | "pending" | "flagged"
    }
  ]
}
```

### 2. StudentSubmissionsTable Component (`/src/features/assignment/components/StudentSubmissionsTable.tsx`)
Interactive table component with:
- **Search functionality**: Filter students by name or ID
- **Pagination**: Display 5 students per page with navigation
- **Status badges**: Colored indicators for submission and AI analysis status
- **Student avatars**: Initials-based circular avatars
- **Responsive layout**: Horizontal scroll on small screens
- **Action buttons**: "VIEW SUBMISSION" for each student

Features:
- Dynamic badge colors based on status
- Icon indicators for submission status (checkmark for submitted, X for missing)
- Search resets pagination to page 1
- Disabled pagination buttons when at first/last page

### 3. ViewAssignment Page (`/src/pages/ViewAssignmentPage.tsx`)
Main page component with:

#### Header Section:
- Back button (uses React Router navigation)
- Assignment title and description
- Due date badge

#### Stats Cards (3 columns):
- **Total Students**: Count of all assigned students
- **Submissions**: Count of completed submissions
- **Missing**: Count of missing submissions

#### Student Submissions Table:
- Integrated StudentSubmissionsTable component
- Full student data display

## Routing

Added route in `App.tsx`:
```typescript
<Route path="/class/:id/assignment/:assignmentId/view" 
        element={<ProtectedRoute><ViewAssignmentPage /></ProtectedRoute>} />
```

Route parameter: `assignmentId` (can be used to fetch specific assignment data from API)

## UI Features

### Status Indicators
- **Submission Status**:
  - Green badge + checkmark icon: "Submitted"
  - Red badge + X icon: "Missing"

- **AI Status**:
  - Blue badge: "AI Checked"
  - Orange badge: "AI Pending"
  - Red badge: "AI Flagged"

### Table Columns
1. Student Name (with avatar)
2. Student ID
3. Submission Status (colored badge with icon)
4. AI Status (colored badge)
5. Submission Time
6. Action (VIEW SUBMISSION button)

## Design Patterns

- **Clean Dashboard UI**: Follows modern card-based design
- **Color-coded Status**: Easy visual identification of submission state
- **Responsive Grid**: Stats cards adapt to screen size (1 col mobile, 3 cols desktop)
- **Interactive Pagination**: Shows current page and total items
- **Search Integration**: Real-time filtering with pagination reset
- **Hover Effects**: Cards and buttons have subtle hover states
- **No Emoji**: Uses Lucide React icons instead

## API Integration Ready

The page is built to accept data from an API:
1. Replace `mockAssignmentDetails` with actual API call in useEffect
2. Use `assignmentId` from params to fetch specific assignment
3. Handle loading and error states
4. Update stats dynamically based on API response

## Component Reusability

- **StudentSubmissionsTable**: Can be reused in other pages showing student submissions
- **Mock data structure**: Can be replicated by API endpoints
- **Utility function**: `getAssignmentStats()` can be used anywhere assignments are displayed
