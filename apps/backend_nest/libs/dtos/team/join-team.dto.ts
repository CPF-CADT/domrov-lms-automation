
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsAlphanumeric, Length } from 'class-validator';

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