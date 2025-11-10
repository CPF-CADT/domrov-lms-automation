import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    MinLength,
    MaxLength,
    IsInt,
    Min,
    Max,
} from 'class-validator';

export class CreateTeamDto {
    @ApiProperty({ description: 'The name of the team', example: 'The A-Team' })
    @IsString()
    @MinLength(3)
    @MaxLength(300)
    name: string;

    @ApiProperty({
        description: 'Maximum number of members in the team',
        example: 5,
    })
    @IsInt()
    @Min(2)
    @Max(20)
    maxMember: number;

    @ApiProperty({
        description: 'The ID of the class this team belongs to',
        example: 1,
    })
    @IsInt()
    classId: number;
}