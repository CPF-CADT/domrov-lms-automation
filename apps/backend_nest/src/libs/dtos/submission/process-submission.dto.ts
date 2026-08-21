import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetFilesSubmissionDto {
  @ApiProperty({
    description: 'File path of the submission',
    example: 'main.bat',
  })
  @IsString()
  @IsNotEmpty()
  file_path: string;
}
export class GetSubmissionFolderDto {
    @ApiProperty({ example: 1, description: 'ID of the submission to get folder contents' })
    @Type(() => Number)
    @IsInt()
    submission_id: number;
}