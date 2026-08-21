// Mock data for assignment details and student submissions

export interface StudentSubmission {
  studentId: string;
  name: string;
  submissionStatus: "submitted" | "missing";
  submissionTime?: string;
  aiStatus: "checked" | "pending" | "flagged";
}

export interface AssignmentDetailsData {
  assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
  };
  students: StudentSubmission[];
}

export const mockAssignmentDetails: AssignmentDetailsData = {
  assignment: {
    id: "ASS-001",
    title: "Binary Tree Implementation",
    description: "Implement a standard Binary Search Tree in C++ including insert, delete, and search operations. Ensure O(log n) complexity for all operations where applicable.",
    dueDate: "Jan 20, 2024",
  },
  students: [
    {
      studentId: "STU-001",
      name: "Alice Johnson",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 11:45 AM",
      aiStatus: "checked",
    },
    {
      studentId: "STU-002",
      name: "Bob Smith",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 09:12 AM",
      aiStatus: "pending",
    },
    {
      studentId: "STU-003",
      name: "Charlie Davis",
      submissionStatus: "missing",
      aiStatus: "pending",
    },
    {
      studentId: "STU-004",
      name: "Diana Lee",
      submissionStatus: "submitted",
      submissionTime: "Oct 23, 2023, 04:20 PM",
      aiStatus: "flagged",
    },
    {
      studentId: "STU-005",
      name: "Edward Brown",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 10:05 AM",
      aiStatus: "checked",
    },
    {
      studentId: "STU-006",
      name: "Fiona Martin",
      submissionStatus: "missing",
      aiStatus: "pending",
    },
    {
      studentId: "STU-007",
      name: "George Wilson",
      submissionStatus: "submitted",
      submissionTime: "Oct 23, 2023, 03:30 PM",
      aiStatus: "pending",
    },
    {
      studentId: "STU-008",
      name: "Hannah Taylor",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 08:15 AM",
      aiStatus: "checked",
    },
    {
      studentId: "STU-009",
      name: "Ian Anderson",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 02:45 PM",
      aiStatus: "flagged",
    },
    {
      studentId: "STU-010",
      name: "Julia Thomas",
      submissionStatus: "missing",
      aiStatus: "pending",
    },
    {
      studentId: "STU-011",
      name: "Kevin Jackson",
      submissionStatus: "submitted",
      submissionTime: "Oct 23, 2023, 06:20 PM",
      aiStatus: "checked",
    },
    {
      studentId: "STU-012",
      name: "Laura White",
      submissionStatus: "submitted",
      submissionTime: "Oct 24, 2023, 07:00 AM",
      aiStatus: "checked",
    },
  ],
};

// Helper function to get assignment stats
export function getAssignmentStats(data: AssignmentDetailsData) {
  const totalStudents = data.students.length;
  const submittedCount = data.students.filter((s) => s.submissionStatus === "submitted").length;
  const missingCount = data.students.filter((s) => s.submissionStatus === "missing").length;

  return {
    totalStudents,
    submittedCount,
    missingCount,
  };
}
