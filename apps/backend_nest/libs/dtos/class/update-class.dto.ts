import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, IsUrl } from 'class-validator';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiPropertyOptional({ description: 'Optional cover image URL for the class' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImageUrl?: string;
}
