import { ApiProperty } from '@nestjs/swagger';

export class JoinTeamResponseDto {
    @ApiProperty({ example: 'Successfully joined team', description: 'Response message' })
    message: string;

    @ApiProperty({ example: 1, description: 'The ID of the team that was joined' })
    teamId: number;
}
