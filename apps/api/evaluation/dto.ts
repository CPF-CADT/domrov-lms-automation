// /api/evaluation/dto.ts

export interface FileContentResponseDto {
  filePath: string;
  content: string;
  contentType: string;
  size: number;
}

export interface FolderItemDto {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  path: string;
  children?: FolderItemDto[];
}

export interface FolderStructureResponseDto {
  submissionId: number;
  structure: FolderItemDto[];
}

export interface AddToQueueDto {
  submissionId: number;
  evaluationType?: 'AI' | 'MANUAL';
}

export interface AddToQueueResponseDto {
  message: string;
  evaluationId: number;
  status: string;
}
