// /api/file/file.api.ts
import axiosInstance from '../axios';
import {
  PresignedUrlRequestDto,
  PresignedUrlResponseDto,
  NotifyUploadDto,
  NotifyUploadResponseDto
} from './dto';

/**
 * Get presigned URL for file upload
 */
export async function getPresignedUrl(data: PresignedUrlRequestDto): Promise<PresignedUrlResponseDto> {
  try {
    const response = await axiosInstance.get<PresignedUrlResponseDto>(`/file/presigned-url`, {
      params: data
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Notify backend that file has been uploaded
 */
export async function notifyUpload(data: NotifyUploadDto): Promise<NotifyUploadResponseDto> {
  try {
    const response = await axiosInstance.post<NotifyUploadResponseDto>(`/file/notify-upload`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Download file by resource ID
 */
export async function downloadFile(resourceId: number): Promise<Blob> {
  try {
    const response = await axiosInstance.get<Blob>(
      `/file/download/${resourceId}`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}
