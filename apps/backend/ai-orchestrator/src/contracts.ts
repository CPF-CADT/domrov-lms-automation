export interface EvaluationRequested {
  messageId?: string;
  schemaVersion?: number;
  correlationId: string;
  evaluationId?: string;
  submissionId: string;
  assignmentId?: string;
  userId: string;
  language: string;
  resourceKey?: string;
  rubric?: unknown[];
  includePaths?: string[];
  excludePaths?: string[];
  requestedAt?: string;
}

export interface EvaluationJob extends EvaluationRequested {
  evaluationId: string;
  jobId: string;
  eventType: 'evaluation.job';
}

export interface EvaluationResult {
  messageId?: string;
  schemaVersion?: number;
  correlationId: string;
  evaluationId: string;
  submissionId: string;
  status?: 'completed' | 'failed';
  score?: number;
  feedback?: string;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: string;
}

export type OrchestrationStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface OrchestrationRecord {
  evaluationId: string;
  correlationId: string;
  submissionId: string;
  userId: string;
  status: OrchestrationStatus;
  score?: number;
  feedback?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}
