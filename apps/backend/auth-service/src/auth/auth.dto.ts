import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterRequest {
  @IsString()
  @Length(1, 50)
  firstName!: string;

  @IsString()
  @Length(1, 50)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Matches(/^[\s\S]+$/)
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;
}

export class LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshRequest {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class VerifyEmailRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;
}

export class PasswordResetRequest {
  @IsEmail()
  email!: string;
}

export class CompletePasswordResetRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;
}

export class ChangePasswordRequest {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}
