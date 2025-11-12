import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateClassDto {
    @ApiProperty({
        description: 'The name of the class',
        example: 'Advanced Web Development',
    })
    @IsString()
    @MinLength(3)
    @MaxLength(300)
    name: string;

    @ApiProperty({
        description: 'An optional description for the class',
        example: 'Learning about NestJS and React',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;
}