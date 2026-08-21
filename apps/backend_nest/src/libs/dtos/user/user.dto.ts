import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, Length, Matches, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '../../enums/Status';

/**
 * DTO for updating user profile
 * All fields are optional - only provided fields will be updated
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    example: 'Male',
    enum: ['Male', 'Female', 'Other'],
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '2000-01-15',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dob?: Date;

  @ApiPropertyOptional({
    description: 'Phone number (unique)',
    example: '+855123456789',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;
}

/**
 * DTO for changing password
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'OldPassword123!',
    minLength: 8,
  })
  @IsString()
  @Length(8, 255)
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewPassword456!',
    minLength: 8,
  })
  @IsString()
  @Length(8, 255)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'NewPassword456!',
    minLength: 8,
  })
  @IsString()
  @Length(8, 255)
  confirmPassword: string;
}

/**
 * Response DTO for user profile
 */
export class UserProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Male' })
  gender?: string;

  @ApiPropertyOptional({ example: '2000-01-15', type: String, format: 'date' })
  dob?: Date;

  @ApiPropertyOptional({ example: '+855123456789' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  profilePictureUrl?: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: false })
  isTwoFactorEnable: boolean;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-02-15T10:30:00.000Z' })
  updated_at: Date;
}

/**
 * Response DTO for profile update
 */
export class UpdateProfileResponseDto {
  @ApiProperty({ example: 'Profile updated successfully' })
  message: string;

  @ApiProperty({ type: UserProfileResponseDto })
  user: UserProfileResponseDto;
}

/**
 * Response DTO for password change
 */
export class ChangePasswordResponseDto {
  @ApiProperty({ example: 'Password changed successfully' })
  message: string;
}

/**
 * DTO for user list item (minimal data for lists)
 */
export class UserListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+855123456789' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  profilePictureUrl?: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: true })
  isVerified: boolean;
}
