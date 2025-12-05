import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitAssignmentDTO {
  @ApiProperty({ description: 'GitHub URL or external link', required: false })
  @IsOptional()
  @IsUrl()
  link?: string;
  
  // Note: Binary files are handled by the Interceptor in the Controller
}