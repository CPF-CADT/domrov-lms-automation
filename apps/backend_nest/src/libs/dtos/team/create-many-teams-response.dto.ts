import { ApiProperty } from '@nestjs/swagger';
import { TeamResponseDto } from './team-response.dto';

export class CreateManyTeamsResponseDto {
    @ApiProperty({ example: '3 teams created successfully.', description: 'Success message with count' })
    message: string;

    @ApiProperty({ type: () => [TeamResponseDto], description: 'List of created teams' })
    teams: TeamResponseDto[];
}
