// libs/dtos/team/team-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../user/user-response.dto';

export class TeamResponseDto {
    @ApiProperty({ example: 1, description: 'Team unique identifier' })
    id: number;

    @ApiProperty({ example: 'The A-Team', description: 'Name of the team' })
    name: string;

    @ApiProperty({ example: 'T1E2A3', description: '6-character team join code' })
    joinCode: string;

    @ApiProperty({ example: 5, description: 'Maximum number of members allowed' })
    maxMember: number;

    @ApiProperty({ type: () => UserResponseDto, nullable: true, description: 'Team leader information' })
    leader: UserResponseDto | null;

    @ApiPropertyOptional({ type: () => [UserResponseDto], description: 'List of team members' })
    members?: UserResponseDto[];

    static fromEntity(team: any): TeamResponseDto {
        return {
            id: team.id,
            name: team.name,
            joinCode: team.joinCode,
            maxMember: team.maxMember,
            leader: team.leader ? UserResponseDto.fromEntity(team.leader) : null,
            members: team.members?.map(UserResponseDto.fromEntity),
        };
    }
}