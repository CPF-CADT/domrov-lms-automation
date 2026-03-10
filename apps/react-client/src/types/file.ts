// File API DTOs
export interface PresignedUrlRequestDto {
    filename: string;
    contentType: string;
    resourceType: 'module' | 'topic' | 'assessment' | 'class' | 'submission';
    resourceId: number;
}

export interface PresignedUrlResponseDto {
    presignedUrl: string;
    key: string;
}

export interface NotifyUploadDto {
    key: string;
    filename: string;
}

export interface NotifyUploadResponseDto {
    message: string;
}

// Cloudinary types
export interface CloudinaryPresignedParams {
    signature: string;
    timestamp: number;
    folder: string;
    public_id: string;
    cloud_name: string;
    api_key: string;
}

export interface CloudinaryUploadResponse {
    asset_id: string;
    public_id: string;
    version: number;
    version_id: string;
    signature: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    tags: string[];
    bytes: number;
    type: string;
    etag: string;
    placeholder: boolean;
    url: string;
    secure_url: string;
    folder: string;
    original_filename: string;
}
