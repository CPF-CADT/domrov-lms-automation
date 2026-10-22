export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES || 250 * 1024 * 1024);
export const ALLOWED_PROVIDERS = ['google', 'github'];

export const MAX_STORAGE_QUOTA_BYTES = Number(process.env.MAX_STORAGE_QUOTA_BYTES || 0);
export const MIN_FREE_SPACE_BYTES = Number(process.env.MIN_FREE_SPACE_BYTES || 0);

