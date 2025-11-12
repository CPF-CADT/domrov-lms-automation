import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTeamItemDto } from './create-team-item.dto';

export class CreateManyTeamsDto {
    @ApiProperty({
        description: 'The ID of the class these teams will belong to',
        example: 1,
    })
    @IsInt()
    classId: number;

    @ApiProperty({
        description: 'A list of teams to create',
        type: [CreateTeamItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTeamItemDto)
    teams: CreateTeamItemDto[];
}