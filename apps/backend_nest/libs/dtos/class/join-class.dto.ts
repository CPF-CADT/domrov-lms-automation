import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsAlphanumeric, Length } from 'class-validator';

export class JoinClassDto {
    @ApiProperty({
        description: 'The 6-character class join code',
        example: 'A1B2C3',
    })
    @IsString()
    @IsAlphanumeric()
    @Length(6, 6)
    joinCode: string;
}