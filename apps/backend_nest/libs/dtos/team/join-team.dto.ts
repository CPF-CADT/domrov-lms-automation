
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsAlphanumeric, Length, IsEmail } from 'class-validator';

export class JoinTeamDto {
    @ApiProperty({
        description: 'The 6-character team join code',
        example: 'T1E2A3',
    })
    @IsString()
    @IsAlphanumeric()
    @Length(6, 6)
    joinCode: string;
}

export class InviteTeamByEmailDto {
    @ApiProperty({
        description: 'Email of the user to invite to the team',
        example: 'member@gmail.com',
    })
    @IsString()
    @IsEmail()
    email: string;
}

export class JoinTeamByTokenDto {
    @ApiProperty({
        description: 'Team invite token from the invite link',
        example: '91eb3fc3-2544-42d0-8a1a-0fcd60f66e93',
    })
    @IsString()
    token: string;
}
