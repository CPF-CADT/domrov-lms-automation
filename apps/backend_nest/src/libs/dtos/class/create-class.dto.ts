import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';

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

    @ApiProperty({
        description: 'An optional cover image URL for the class',
        example: 'https://res.cloudinary.com/example/image/upload/v123/cover.jpg',
    })
    @IsOptional()
    @IsUrl()
    coverImageUrl?: string;
}