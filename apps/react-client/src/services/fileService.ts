import axiosInstance from '@/lib/axiosInstance';
import type {
    ApiResponse,
    PresignedUrlRequestDto,
    PresignedUrlResponseDto,
    NotifyUploadDto,
    NotifyUploadResponseDto,
    CloudinaryPresignedParams,
    CloudinaryUploadResponse,
} from '@/types';

/**
 * Get presigned URL for file upload
 */
export async function getPresignedUrl(data: PresignedUrlRequestDto): Promise<ApiResponse<PresignedUrlResponseDto>> {
    const response = await axiosInstance.get<ApiResponse<PresignedUrlResponseDto>>('/file/presigned-url', {
        params: data
    });
    return response.data;
}

/**
 * Get Cloudinary presigned parameters for image upload
 */
export async function getCloudinaryPresignedUrl(): Promise<CloudinaryPresignedParams> {
    const response = await axiosInstance.get<ApiResponse<CloudinaryPresignedParams>>('/file/cloudinary-presigned-url');
    // Handle different response formats
    const result = response.data;
    if (result.success && result.data) {
        return result.data;
    }
    // Direct response format
    return result as unknown as CloudinaryPresignedParams;
}

/**
 * Upload image to Cloudinary using presigned parameters
 */
export async function uploadToCloudinary(
    file: File,
    params: CloudinaryPresignedParams
): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', params.signature);
    formData.append('timestamp', params.timestamp.toString());
    formData.append('folder', params.folder);
    formData.append('public_id', params.public_id);
    formData.append('api_key', params.api_key);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloud_name}/image/upload`;

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Complete image upload flow: get presigned params and upload to Cloudinary
 */
export async function uploadImage(file: File): Promise<CloudinaryUploadResponse> {
    const params = await getCloudinaryPresignedUrl();
    return uploadToCloudinary(file, params);
}

/**
 * Notify backend that file has been uploaded
 */
export async function notifyUpload(data: NotifyUploadDto): Promise<ApiResponse<NotifyUploadResponseDto>> {
    const response = await axiosInstance.post<ApiResponse<NotifyUploadResponseDto>>('/file/notify-upload', data);
    return response.data;
}

/**
 * Download file by resource ID
 */
export async function downloadFile(resourceId: number): Promise<Blob> {
    const response = await axiosInstance.get<Blob>(`/file/download/${resourceId}`, {
        responseType: 'blob'
    });
    return response.data;
}

/**
 * Upload file to presigned URL
 */
export async function uploadToPresignedUrl(presignedUrl: string, file: File): Promise<void> {
    await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });
}

const fileService = {
    getPresignedUrl,
    getCloudinaryPresignedUrl,
    uploadToCloudinary,
    uploadImage,
    notifyUpload,
    downloadFile,
    uploadToPresignedUrl,
};

export default fileService;
