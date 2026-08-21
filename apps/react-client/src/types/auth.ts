// Auth DTOs
export interface RegisterUserDTO {
    firstName: string;
    lastName: string;
    gender?: 'M' | 'F' | 'N/A';
    dob?: Date;
    phoneNumber?: string;
    email: string;
    password: string;
    confirmPassword: string;
    profilePictureUrl?: string;
}

export interface LoginUserDTO {
    email: string;
    password: string;
}

export interface VerifyOtpDTO {
    email: string;
    otp: string;
}

export interface ResendOtpDTO {
    email: string;
}

// Auth Response DTOs
export interface SignUpResponseDto {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
}

export interface LoginResponseDto {
    accessToken: string;
}

export interface RefreshTokenResponseDto {
    status: string;
    accessToken: string;
    issuedAt: number;
}

export interface AuthMessageResponseDto {
    status: string;
    message: string;
}
