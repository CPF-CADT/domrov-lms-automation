import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class InviteEmailDto {
    @ApiProperty({
        description: "The email of the user to invite",
        example: 'student@example.com',
    })
    @IsString()
    @IsEmail()
    email: string;
}