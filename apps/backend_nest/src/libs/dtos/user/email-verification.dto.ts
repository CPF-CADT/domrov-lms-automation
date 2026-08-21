import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDTO {
    @ApiProperty({ description: 'User email to verify', example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: '6-digit OTP sent to email', example: '123456' })
    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
    otp: string;
}

export class ResendOtpDTO {
    @ApiProperty({ description: 'User email to resend OTP', example: 'user@example.com' })
    @IsEmail()
    email: string;
}
