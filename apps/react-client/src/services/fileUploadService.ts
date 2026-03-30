import axiosInstance from '@/lib/axiosInstance';

export interface PresignedUrlResponse {
    presignedUrl: string;
    key: string;
}

export interface NotifyUploadPayload {
    key: string;
    filename: string;
}

export interface UploadResponse {
    key: string;
    resourceId?: number;
}

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

/**
 * Complete file upload flow: get URL -> upload to R2 -> notify backend
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
        // Step 1: Get presigned URL with correct content type
        const contentType = getContentType(file.name);
        console.log('📋 Content type:', { filename: file.name, detected: contentType });

        const { presignedUrl, key } = await getPresignedUrl(
            file.name,
            resourceType,
            resourceId
        );

        // Step 2: Upload to R2
        await uploadFileToR2(file, presignedUrl, onProgress);

        // Step 3: Notify backend and capture resourceId
        const notifyResponse = await notifyBackendOfUpload({
            key,
            filename: file.name,
        });

        console.log('✅ Upload flow complete:', { key, resourceId: notifyResponse.resourceId });
        return {
            key,
            resourceId: notifyResponse.resourceId,
        };
    } catch (err: any) {
        console.error('❌ Upload flow failed:', err);
        throw err;
    }
}

const fileUploadService = {
    getPresignedUrl,
    uploadFileToR2,
    notifyBackendOfUpload,
    uploadFileFlow,
};

export default fileUploadService;
