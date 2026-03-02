// /api/assessment/dto.ts

import { SubmissionType } from '../enums/SubmissionType';
import { SubmissionMethod } from '../enums/SubmissionMethod';
import { AIModelSelectionMode } from '../enums/AIModelSelectionMode';

export interface ResourceInfoDto {
  id: number;
  title?: string;
  type?: string;
  url?: string;
}

export interface AssessmentResourceDto {
  id: number;
  resource: ResourceInfoDto;
}

export interface RubricDto {
  id: number;
  definition: string;
  totalScore: number;
}

export interface ClassInfoForAssessmentDto {
  id: number;
  name?: string;
}

export interface AIModelInfoDto {
  id: number;
  name?: string;
  provider?: string;
}

export interface TeamAssessmentDto {
  assessment_id: number;
  team_id: number;
  team?: {
    id: number;
    name: string;
  };
}

export interface AssessmentListItemDto {
  id: number;
  title: string;
  instruction: string;
  dueDate: Date;
  startDate: Date;
  maxScore: number;
  session: number;
  isPublic: boolean;
  submissionType: SubmissionType;
  allowLate: boolean;
  penaltyCriteria?: string;
  aiEvaluationEnable: boolean;
  aiModelSelectionMode: AIModelSelectionMode;
  allowedSubmissionMethod: SubmissionMethod;
  created_at?: Date;
  updated_at?: Date;
  resources?: AssessmentResourceDto[];
}

export interface AssessmentDetailDto extends AssessmentListItemDto {
  rubrics?: RubricDto[];
  user_exclude_files?: string[];
  user_include_files?: string[];
  class?: ClassInfoForAssessmentDto;
  aiModel?: AIModelInfoDto;
  teamAssessments?: TeamAssessmentDto[];
}

export interface CreateDraftResponseDto {
  message: string;
  assessmentId: number;
}

export interface PublishAssessmentResponseDto {
  message: string;
}

export interface UpdateAssessmentResponseDto {
  message: string;
  assessment: AssessmentDetailDto;
}

export interface DeleteAssessmentResponseDto {
  id: number;
  title?: string;
}

export interface TeamTrackingItemDto {
  teamId: number;
  name: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED';
  score: number | null;
}

export interface IndividualTrackingItemDto {
  studentId: number;
  name: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED';
  score: number | null;
}

export interface UpdateResourceDTO {
  resourceId: number;
}

export interface UpdateRubricDTO {
  // Define fields as per backend update-rubric.dto.ts
}

export interface UpdateAssessmentDto {
  title?: string;
  instruction?: string;
  startDate?: Date;
  dueDate?: Date;
  maxScore?: number;
  session?: number;
  allowLate?: boolean;
  submissionType?: SubmissionType;
  aiEvaluationEnable?: boolean;
  aiModelSelectionMode?: AIModelSelectionMode;
  allowedSubmissionMethod?: SubmissionMethod;
  allowedTeamIds?: number[];
  rubrics?: UpdateRubricDTO[];
  resources?: UpdateResourceDTO[];
  user_exclude_files?: string[];
  user_include_files?: string[];
}

export interface CreateAssessmentDto {
  title: string;
  instruction: string;
  startDate: Date;
  dueDate: Date;
  maxScore: number;
  session: number;
  allowLate?: boolean;
  penaltyCriteria?: string;
  submissionType: SubmissionType;
  aiEvaluationEnable?: boolean;
  aiModelSelectionMode?: AIModelSelectionMode;
  allowedSubmissionMethod: SubmissionMethod;
  classId: number;
  rubrics?: RubricDto[];
  resources?: ResourceInfoDto[];
  allowedTeamIds?: number[];
  user_exclude_files?: string[];
  user_include_files?: string[];
}

export interface AssessmentTrackingResponseDto {
  assessmentId: number;
  type: 'TEAM' | 'INDIVIDUAL';
  items: (TeamTrackingItemDto | IndividualTrackingItemDto)[];
  totalItems: number;
  submittedCount: number;
  gradedCount: number;
}

export interface AssessmentStatsResponseDto {
  assessmentId: number;
  classId: number;
  title: string;
  totalStudents: number;
  totalSubmissions: number;
  submissionRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  standardDeviation: number;
  activeTeams?: number;
  completedTeams?: number;
}

export interface CompleteAssessmentResponseDto {
  message: string;
  assessmentId: number;
  status: string;
}
