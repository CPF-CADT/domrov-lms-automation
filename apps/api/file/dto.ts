// /api/file/dto.ts

export interface PresignedUrlRequestDto {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignedUrlResponseDto {
  url: string;
  expiration: Date;
  headers: Record<string, string>;
}

export interface NotifyUploadDto {
  filename: string;
  key: string;
  contentType: string;
  size: number;
  assessmentId?: number;
  submissionId?: number;
}

export interface NotifyUploadResponseDto {
  message: string;
  resourceId: number;
}

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
