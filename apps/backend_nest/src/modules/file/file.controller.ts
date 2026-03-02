import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { UserId } from '../../common/decorators/user.decorator';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import express from 'express';
import { IsNotEmpty, IsString } from 'class-validator';

export class NotifyUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  filename: string;
}

@ApiTags('Files')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  /**
   * GET /file/presigned-url?filename=xxx&contentType=yyy&resourceType=module&resourceId=123
   * Returns a presigned PUT URL for uploading files directly to R2
   */
  @Get('presigned-url')
  @ApiOperation({ summary: 'Get presigned URL for uploading a file to R2' })
  @ApiQuery({ name: 'filename', required: true, type: String })
  @ApiQuery({ name: 'contentType', required: true, type: String })
  @ApiQuery({
    name: 'resourceType',
    required: true,
    enum: ['module', 'topic', 'assessment', 'class', 'submission'],
  })
  @ApiQuery({ name: 'resourceId', required: true, type: Number })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          presignedUrl: 'https://example.r2.com/presigned-url'
        }
      }
    }
  })
  async getPresignedUrl(
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @Query('resourceType') resourceType: 'module' | 'topic' | 'assessment' | 'class' | 'submission',
    @Query('resourceId') resourceId: number,
    @UserId() userId: number
  ): Promise<{ success: true; data: any }> {
    if (!filename || !contentType || !resourceType || !resourceId) {
      throw new Error('Missing required query params');
    }

    const data = await this.fileService.generatePresignedUrl(userId, resourceType, resourceId, filename, contentType);
    return { success: true, data };
  }

  /**
   * POST /file/notify-upload
   * Frontend calls this after successful R2 upload
   */
  @Post('notify-upload')
  @ApiOperation({ summary: 'Notify backend that file upload to R2 was successful' })
  @ApiBody({ type: NotifyUploadDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Resource saved successfully'
        }
      }
    }
  })
  async notifyUpload(
    @UserId() userId: number,
    @Body() body: NotifyUploadDto
  ): Promise<{ success: true; data: any }> {
    const { key, filename } = body;
    if (!key || !filename) {
      throw new Error('Missing required body params');
    }

    const data = await this.fileService.notifyUploadSuccess(userId, key, filename);
    return { success: true, data };
  }

  @Get('download/:resourceId')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('resourceId') resourceId: number,
    @Res() res: express.Response,
    @UserId() userId: number,
  ) {
    const { stream, filename, contentType } = await this.fileService.getResourceStream(userId, resourceId);
    const encodedFileName = encodeURIComponent(filename);
    const safeFileName = encodedFileName.replace(/%20/g, ' ');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.setHeader('Content-Type', contentType || 'application/octet-stream');

    return new Promise<void>((resolve, reject) => {
      stream.pipe(res)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}