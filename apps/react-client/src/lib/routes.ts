export const routes = {
  dashboard: "/dashboard",
  classes: "/classes",
  class: (classId: string | number) => `/classes/${classId}`,
  classGeneral: (classId: string | number) => `/classes/${classId}/general`,
  classAssignments: (classId: string | number) => `/classes/${classId}/assignments`,
  classStudents: (classId: string | number) => `/classes/${classId}/students`,
  classTeams: (classId: string | number) => `/classes/${classId}/teams`,
  classGrades: (classId: string | number) => `/classes/${classId}/grades`,
  assignmentCreate: (classId: string | number) => `/classes/${classId}/assignments/new`,
  assignment: (classId: string | number, assignmentId: string | number) =>
    `/classes/${classId}/assignments/${assignmentId}`,
  assignmentEdit: (classId: string | number, assignmentId: string | number) =>
    `/classes/${classId}/assignments/${assignmentId}/edit`,
  assignmentGrade: (classId: string | number, assignmentId: string | number) =>
    `/classes/${classId}/assignments/${assignmentId}/grade`,
  assignmentSubmissions: (classId: string | number, assignmentId: string | number) =>
    `/classes/${classId}/assignments/${assignmentId}/submissions`,
  submission: (
    classId: string | number,
    assignmentId: string | number,
    submissionId: string | number,
  ) => `/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}`,
};
