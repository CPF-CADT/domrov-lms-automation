import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginUserDTO {

    @ApiProperty({ example: 'sokdara@gmail.com', description: 'Email address of the user' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'P@ssw0rd123', description: 'Password (6-20 characters)' })
    @IsString()
    password: string;
}
