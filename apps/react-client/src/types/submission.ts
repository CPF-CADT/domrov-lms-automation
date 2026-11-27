import type { SubmissionStatus, ResourceType, FeedbackType, EvaluationType } from './enums';
import type { UserBasicInfoDto } from './user';

export interface Submission {
  submission_id: number;
  user_id: number;
  assessment_id: number;
  submission_time: Date;
  status: string;
}

// API DTOs
export interface SubmitResourceDTO {
  resourceId?: number;
}

export interface SubmitAssignmentDto {
  resources?: SubmitResourceDTO[];
  githubUrl?: string;
  comments?: string;
}

export interface GradeSubmissionDTO {
  score: number;
  feedback?: string;
}

export interface FeedbackItemDto {
  path: string;
  startLine?: number;
  endLine?: number;
  message: string;
  type: FeedbackType;
  id?: string;
}

// Response DTOs
export interface SubmitAssignmentResponseDto {
  message: string;
  submissionId: number;
}

export interface ApproveSubmissionResponseDto {
  message: string;
  submissionId: number;
  evaluationId: number;
  isApproved: boolean;
}

export interface AddFeedbackResponseDto {
  message: string;
  evaluationId: number;
  addedItemsCount: number;
}

export interface UpdateFeedbackResponseDto {
  message: string;
  feedbackId: string;
}

// User/Team Info DTOs
export interface TeamMemberDto {
  id: number;
  user: UserBasicInfoDto | null;
}

export interface TeamInfoDto {
  id: number;
  name: string;
  maxMember: number;
  members: TeamMemberDto[];
}

export interface ClassBasicInfoDto {
  id: number;
  name: string;
}

export interface AssessmentBasicInfoDto {
  id: number;
  title: string;
  maxScore: number;
  class: ClassBasicInfoDto | null;
}

// Resource DTOs
export interface ResourceBasicInfoDto {
  id: number;
  title: string;
  type: ResourceType;
  url: string | null;
}

export interface SubmissionResourceDto {
  id: number;
  resource: ResourceBasicInfoDto | null;
}

// Evaluation DTOs
export interface EvaluationFeedbackItemDto {
  id: string;
  filePath: string;
  startLine: number | null;
  endLine: number | null;
  message: string;
  feedbackType: FeedbackType;
  createdAt: Date;
}

export interface EvaluationResponseDto {
  id: number;
  score: number;
  feedback: string | null;
  penaltyScore: number;
  isApproved: boolean;
  isModified: boolean;
  evaluationType: EvaluationType;
  aiOutput: string | null;
  confidencePoint: string | null;
  feedbacks: EvaluationFeedbackItemDto[];
  created_at: Date;
  updated_at: Date;
}

export interface EvaluationSummaryDto {
  id: number;
  score: number;
  feedback: string | null;
  aiFeedback: string | null;
  isApproved: boolean;
}

// Submission Viewer Response
export interface SubmissionViewerResponseDto {
  id: number;
  created_at: Date;
  updated_at: Date;
  submissionTime: Date;
  status: SubmissionStatus;
  attemptNumber: number;
  user: UserBasicInfoDto | null;
  team: TeamInfoDto | null;
  assessment: AssessmentBasicInfoDto | null;
  evaluation: EvaluationResponseDto | null;
  resources: SubmissionResourceDto[];
}

// My Submission Response
export interface MySubmissionResourceDto {
  id: number;
  title: string;
  type: ResourceType;
  url: string | null;
}

export interface MySubmissionResponseDto {
  id?: number;
  status: SubmissionStatus;
  attemptNumber?: number;
  submissionTime?: Date;
  comments?: string | null;
  message?: string;
  resources: MySubmissionResourceDto[];
  evaluation: EvaluationSummaryDto | null;
}

// Submission Status Response
export interface SubmissionStatusItemDto {
  assessmentId: number;
  title: string;
  dueDate: Date;
  status: string;
  submissionId: number | null;
  grade: number | null;
}

// Assignment Roster Response
export interface RosterMemberDto {
  userId: number;
  fullName: string;
  profileUrl: string | null;
}

export interface TeamRosterItemDto {
  type: 'TEAM';
  id: number;
  name: string;
  members: RosterMemberDto[];
  status: string;
  submissionId: number | null;
  score: number | null;
}

export interface IndividualRosterItemDto {
  type: 'INDIVIDUAL';
  userId: number;
  fullName: string;
  profileUrl: string | null;
  status: string;
  submissionId: number | null;
  score: number | null;
}

export interface AssessmentStatsResponseDto {
  assessmentId: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  gradedSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}
