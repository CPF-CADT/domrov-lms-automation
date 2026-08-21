import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class TransferOwnershipDto {
    @ApiProperty({ example: 5, description: 'The ID of the new owner (must be a student in this class)' })
    @IsInt()
    @IsPositive()
    newOwnerId: number;
}
