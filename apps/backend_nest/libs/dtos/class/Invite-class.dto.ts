import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class InviteClassByEmailDto {
    @ApiProperty({
        description: 'Email address to invite to the class',
        example: 'student@gmail.com',
    })
    @IsString()
    @IsEmail()
    email: string;
}
