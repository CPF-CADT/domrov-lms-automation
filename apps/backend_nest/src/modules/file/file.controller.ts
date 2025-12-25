import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileUploadDto } from '../../../libs/dtos/file/file-upload.dto';
import { FileService } from './file.service';

@ApiTags('Files')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    required: true,
    type: FileUploadDto,
  })
  
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = await this.fileService.mockUploadFile(file);
    return {
      filename: file.originalname,
      url,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

}
