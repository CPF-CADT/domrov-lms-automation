export interface Envelope<T> {
  messageId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  eventType?: string;
  schemaVersion?: number;
  occurredAt?: string;
  producer?: string;
  payload?: T;
  [key: string]: unknown;
}

export interface EvaluationRequest {
  evaluationId?: string;
  submissionId: string;
  assignmentId?: string;
  userId: string;
  language: string;
  resourceKey?: string;
  rubric?: unknown[];
  includePaths?: string[];
  excludePaths?: string[];
}

export interface EvaluationResult {
  evaluationId: string;
  submissionId: string;
  userId: string;
  status: 'completed' | 'failed';
  score?: number;
  feedback?: string;
  errorCode?: string;
}

export function unwrap<T>(message: T | Envelope<T>): T {
  const value = message as Envelope<T>;
  return (value && typeof value === 'object' && value.payload !== undefined ? value.payload : message) as T;
}
