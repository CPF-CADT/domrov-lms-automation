// libs/dtos/team/team-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { TeamResponseDto } from './team-response.dto';

export class TeamListResponseDto {
    @ApiProperty({ type: () => [TeamResponseDto], description: 'List of teams' })
    teams: TeamResponseDto[];

    static fromEntities(teams: any[]): TeamListResponseDto {
        return { teams: teams.map(TeamResponseDto.fromEntity) };
    }
}