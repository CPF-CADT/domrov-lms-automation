import { IsString, IsEmail, IsIn, Length, IsOptional, IsNumber, Matches, IsDate, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPasswordConfirmed, IsRealEmailDomain } from '../../../src/common/decorators/IsPasswordConfirmed';


export class RegisterUserDTO {

    @ApiProperty({ example: 'Sok', description: 'family name of the user' })
    @IsString()
    @Length(1, 50)
    firstName: string;

    @ApiProperty({ example: 'Dara', description: 'Given name of the user' })
    @IsString()
    @Length(1, 50)
    lastName: string;

    @IsOptional()
    @ApiProperty({ example: 'M', description: 'Gender of the user. Allowed values: M, F, N/A' })
    @IsString()
    @IsIn(['M', 'F', 'N/A'])
    gender: string;

    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined), { toClassOnly: true })
    @IsDate({ message:'dob must be a Date in format "YYYY-MM-DD"' })
    @ApiPropertyOptional({ example: '2000-01-01', description: 'Date of birth in YYYY-MM-DD format' })
    dob: Date;

    @IsOptional()
    @IsString()
    @Matches(/^0\d{8,9}$/, { message: 'Phone number must start with 0 and be 9-10 digits' })
    @ApiPropertyOptional({ example: '0123456789', description: 'Phone number starting with 0, 9-10 digits' })
    phoneNumber: string;
    
    @ApiProperty({ example: 'sokdara@gmail.com', description: 'Email address of the user' })
    @IsRealEmailDomain({ message: 'Email domain appears suspicious or invalid' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'P@ssw0rd123', description: 'Password (6-20 characters)' })
    @IsString()
    @Length(6, 20)
    password: string;

    @IsPasswordConfirmed({ message: "Password does not Match !" })
    @ApiProperty({ example: 'P@ssw0rd123', description: 'Confirm password, must match password' })
    confirmPassword: string;

    @IsOptional()
    @ApiProperty({ example: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg?semt=ais_hybrid&w=740&q=80', description: 'User profile url' })
    @IsUrl()
    profilePictureUrl?:string;
}

