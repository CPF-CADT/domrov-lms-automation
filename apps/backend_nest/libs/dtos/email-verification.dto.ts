import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class VerifyOtpDTO {
    @ApiProperty({ description: 'User email to verify', example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: '6-digit OTP sent to email', example: '123456' })
    otp: string;
}

export class ResendOtpDTO {
    @ApiProperty({ description: 'User email to resend OTP', example: 'user@example.com' })
    @IsEmail()
    email: string;
}
