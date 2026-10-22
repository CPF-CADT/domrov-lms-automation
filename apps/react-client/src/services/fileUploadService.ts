import axiosInstance from '@/lib/AxiosInstance';
import type { LocalUploadResponse } from '@/types/File';

export interface PresignedUrlResponse {
    presignedUrl: string;
    key: string;
}

export interface NotifyUploadPayload {
    key: string;
    filename: string;
}

export type UploadResponse = LocalUploadResponse;

/**
 * Determine correct MIME type based on file extension
 */
function getContentType(fileType?: string): string {


    const detectedFromExt = 'application/octet-stream';

    // 🚨 Rule: NEVER trust generic browser type
    if (!fileType || fileType === 'application/octet-stream') {
        return detectedFromExt || 'application/octet-stream';
    }

    // 🚨 If browser type exists but mismatches extension → prefer extension
    if (detectedFromExt && fileType !== detectedFromExt) {
        console.warn(`⚠️ MIME mismatch: browser=${fileType}, ext=${detectedFromExt}`);
        return detectedFromExt;
    }

    return fileType;
}

/**
 * Get presigned URL for R2 upload
 */
export async function getPresignedUrl(
    filename: string,
    resourceType?: string,
    resourceId?: number
): Promise<PresignedUrlResponse> {

    const finalContentType = getContentType(filename);

    const params = new URLSearchParams({
        filename,
        contentType: finalContentType, // ✅ ALWAYS normalized
    });

    if (resourceType) params.append('resourceType', resourceType);
    if (resourceId) params.append('resourceId', resourceId.toString());

    const url = `/file/presigned-url?${params.toString()}`;
    console.log('📡 Requesting presigned URL:', url);

    try {
        const response = (await axiosInstance.get(url)).data;

        console.log('✅ Got presigned URL:', {
            key: response.data.key,
            presignedUrl: response.data.presignedUrl,
            contentType: finalContentType, // debug visibility
        });

        return response.data;
    } catch (err: any) {
        console.error(
            '❌ Failed to get presigned URL:',
            err.response?.data || err.message
        );
        throw err;
    }
}

/**
 * Upload file to R2 using presigned URL
 */
export async function uploadFileToR2(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: number) => void
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                console.log(`📤 Upload progress: ${progress}%`);
                onProgress?.(progress);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network error"));

        xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream"
        );

        xhr.send(file);
    });
}

/** Upload a file directly through the NestJS local-storage endpoint. */
export async function uploadFileToLocal(
    file: File,
    resourceType: string,
    resourceId: number,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resourceType', resourceType);
    formData.append('resourceId', resourceId.toString());

    const response = await axiosInstance.post('/file/upload', formData, {
        onUploadProgress: (event) => {
            const total = event.total || file.size;
            if (total > 0) onProgress?.(Math.min(100, Math.round((event.loaded / total) * 100)));
        },
    });
    const data = response.data.data;
    return {
        ...data,
        filename: data.filename ?? data.originalFilename,
    };
}

/**
 * Notify backend that file was uploaded to R2
 */
export async function notifyBackendOfUpload(
    payload: NotifyUploadPayload
): Promise<{ message: string; resourceId?: number }> {
    console.log('🔔 Notifying backend of upload:', { filename: payload.filename, key: payload.key });

    try {
        const response = (await axiosInstance.post('/file/notify-upload', payload)).data;
        console.log('✅ Backend notified:', response.data);
        return response.data;
    } catch (err: any) {
        console.error('❌ Failed to notify backend:', err.response?.data || err.message);
        throw err;
    }
}

/** Create a URL resource. This uses the temporary compatibility endpoint for external links only. */
export async function createExternalResource(
    url: string,
): Promise<{ message: string; resourceId?: number }> {
    return notifyBackendOfUpload({ key: url, filename: url });
}

/**
 * Complete file upload flow through local EBS storage.
 */
export async function uploadFileFlow(
    file: File,
    resourceType?: string,
    resourceId?: number,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> {
    console.log('🚀 Starting file upload flow:', {
        filename: file.name,
        fileType: file.type,
        resourceType,
        resourceId,
    });

    try {
        if (!resourceType || !resourceId) throw new Error('Upload parent type and ID are required');
        const response = await uploadFileToLocal(file, resourceType, resourceId, onProgress);
        console.log('✅ Local upload flow complete:', { key: response.key, resourceId: response.resourceId });
        return response;
    } catch (err: any) {
        console.error('❌ Upload flow failed:', err);
        throw err;
    }
}

const fileUploadService = {
    getPresignedUrl,
    uploadFileToR2,
    uploadFileToLocal,
    notifyBackendOfUpload,
    createExternalResource,
    uploadFileFlow,
};

export default fileUploadService;
