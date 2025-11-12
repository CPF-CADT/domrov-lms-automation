import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class InviteTeamDto {
    @ApiProperty({
        description: "The email of the user to invite",
        example: 'teammate@example.com',
    })
    @IsString()
    @IsEmail()
    email: string;
}