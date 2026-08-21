export interface SubmissionFile {
  name: string;
  size: number;
  path: string;
  uploadedAt: string;
}

export interface SubmissionLink {
  url: string;
  addedAt: string;
}

export interface SubmissionCodeFile extends SubmissionFile {
  type: "file";
  content: string;
  feedback: Record<string, unknown>;
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  userId: string;
  submittedAt: string;
  type: "file" | "link";
  files: SubmissionFile[];
  links: SubmissionLink[];
  codeFiles: SubmissionCodeFile[];
  status: string;
  score: number | null;
  feedback: Record<string, unknown>;
}
