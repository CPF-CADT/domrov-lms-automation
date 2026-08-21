import { ApiProperty } from '@nestjs/swagger';

export class InviteLinkResponseDto {
    @ApiProperty({ 
        example: 'https://example.com/team/join/link?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        description: 'Invite link URL with token for joining the team' 
    })
    link: string;
}
