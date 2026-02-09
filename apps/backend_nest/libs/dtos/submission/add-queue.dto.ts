// dto/add-queue.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddQueueDto {
    @ApiProperty({
        example: 'sub_123456',
        description: 'Submission ID to enqueue',
    })
    @IsString()
    submission_id: string;
}
