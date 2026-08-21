export interface Evaluation {
  submission_id: number;
  score: number;
  feedback: string;
  penalty_score: number;
  isApproved: boolean;
  isModified: boolean;
  evaluation_type: string;
  ai_output: string;
  confidence_point: string;
}

// API DTOs
export interface FileContentDto {
  type: 'file';
  name: string;
  path: string;
  content: string[];
}

export interface ProcessSubmissionResponseDto {
  file: FileContentDto;
}

export interface FolderNodeDto {
  name: string;
  type: 'file' | 'folder';
  children?: FolderNodeDto[];
}

export interface FolderStructureResponseDto {
  folder_structure: FolderNodeDto;
}

export interface AddToQueueDto {
  submission_id: string;
}

export interface AddToQueueResponseDto {
  message: string;
}
