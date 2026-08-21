import { ApiProperty } from '@nestjs/swagger';

export class JoinClassResponseDto {
    @ApiProperty({ example: 1, description: 'The ID of the class that was joined' })
    classId: number;

    @ApiProperty({ example: 'Introduction to TypeScript', description: 'The name of the class that was joined' })
    className: string;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'The timestamp when the user joined the class' })
    joinedAt: Date;
}
