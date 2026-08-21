import { ApiProperty } from '@nestjs/swagger';

export class InviteLinkResponseDto {
    @ApiProperty({ 
        example: 'https://example.com/class/join/link?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        description: 'Invite link URL with token for joining the class' 
    })
    link: string;
}
