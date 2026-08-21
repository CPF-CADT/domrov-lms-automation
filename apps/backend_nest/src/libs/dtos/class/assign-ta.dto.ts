import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AssignTADto {
    @ApiProperty({ example: 5, description: 'User ID of the Teaching Assistant' })
    @IsInt()
    @IsPositive()
    taId: number;
}
