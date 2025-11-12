import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    MinLength,
    MaxLength,
    IsInt,
    Min,
    Max,
    IsOptional,
    IsArray,
    ArrayNotEmpty,
    ValidateIf,
} from 'class-validator';

export class CreateTeamItemDto {
    @ApiProperty({ description: 'The name of the team', example: 'Team Alpha' })
    @IsString()
    @MinLength(3)
    @MaxLength(300)
    name: string;

    @ApiProperty({
        description: 'Maximum number of members in the team',
        example: 4,
    })
    @IsInt()
    @Min(2)
    @Max(20)
    maxMember: number;

    @ApiPropertyOptional({
        description: 'User ID of the leader (required if memberIds exist)',
        example: 5,
    })
    @ValidateIf((o) => o.memberIds && o.memberIds.length > 0)
    @IsInt({ message: 'leaderId must be an integer when memberIds are provided' })
    leaderId?: number;

    @ApiPropertyOptional({
        description: 'List of member user IDs (optional)',
        example: [2, 3, 4],
    })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    memberIds?: number[];
}
