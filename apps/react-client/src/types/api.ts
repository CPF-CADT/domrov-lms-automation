// Common API response wrapper
export interface ApiResponse<T> {
    success: true;
    data: T;
}

export interface MessageResponse {
    message: string;
}
