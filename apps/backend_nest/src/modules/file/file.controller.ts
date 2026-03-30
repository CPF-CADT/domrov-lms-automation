import { Body, Controller, Get, Param, Post, Query, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { UserId } from '../../common/decorators/user.decorator';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import express from 'express';
import { NotifyUploadDto, PresignedUrlResponseDto, NotifyUploadResponseDto } from '../../libs/dtos/file/file-response.dto';

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
          presignedUrl: 'https://example.r2.com/presigned-url',
          key: '123/module/456/file.pdf'
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
  ): Promise<{ success: true; data: PresignedUrlResponseDto }> {
    if (!filename || !contentType || !resourceType || !resourceId) {
      console.error('Missing query params:', { filename, contentType, resourceType, resourceId });
      throw new NotFoundException('Missing required query params: filename, contentType, resourceType, resourceId');
    }
    if (!userId) {
      console.error('Missing userId from auth');
      throw new NotFoundException('User ID not found in token');
    }

    try {
      const data = await this.fileService.generatePresignedUrl(userId, resourceType, resourceId, filename, contentType);
      return { success: true, data };
    } catch (err) {
      console.error('Error in getPresignedUrl:', err);
      throw err;
    }
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
          message: 'Resource saved successfully',
          resourceId: 123
        }
      }
    }
  })
  async notifyUpload(
    @UserId() userId: number,
    @Body() body: NotifyUploadDto
  ): Promise<{ success: true; data: NotifyUploadResponseDto }> {
    const { key, filename } = body;
    if (!key || !filename) {
      console.error('Missing notify upload body params:', { key, filename });
      throw new NotFoundException('Missing required body params: key, filename');
    }
    if (!userId) {
      console.error('Missing userId from auth');
      throw new NotFoundException('User ID not found in token');
    }

    try {
      const data = await this.fileService.notifyUploadSuccess(userId, key, filename);
      return { success: true, data };
    } catch (err) {
      console.error('Error in notifyUpload:', err);
      throw err;
    }
  }

  @Get('download/:resourceId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a resource file' })
  @ApiParam({ name: 'resourceId', type: Number, description: 'ID of the resource to download' })
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

  /**
   * GET /file/cloudinary-presigned-url
   * Returns a presigned URL for uploading files directly to Cloudinary
   *
   * This endpoint provides the necessary parameters to upload files directly to Cloudinary.
   * After uploading with these parameters, Cloudinary will return a response with the following structure:
   */
  @Get('cloudinary-presigned-url')
  @ApiOperation({
    summary: 'Get presigned URL parameters for uploading a file to Cloudinary',
    description: `
    Returns the required parameters to upload files directly to Cloudinary.
    Use these parameters in a POST request to https://api.cloudinary.com/v1_1/{cloud_name}/image/upload

    **Cloudinary Upload Response Format:**
    After successful upload, Cloudinary returns detailed information about the uploaded image:

    \`\`\`json
    {
      "asset_id": "162fa300e3a0f2467ecd14876499212d",
      "public_id": "domrov-pictures/domrov-pictures/1772881965_448",
      "version": 1772881967,
      "version_id": "4277fa360933a70a6a51289d5ca26e21",
      "signature": "797c81df038c67d2d59851c59b148264b98fbd15",
      "width": 1559,
      "height": 1079,
      "format": "png",
      "resource_type": "image",
      "created_at": "2026-03-07T11:12:47Z",
      "tags": [],
      "bytes": 616260,
      "type": "upload",
      "etag": "d46b0ff99f14b099e9ef181c0bc2a79b",
      "placeholder": false,
      "url": "http://res.cloudinary.com/dmddfnsun/image/upload/v1772881967/domrov-pictures/domrov-pictures/1772881965_448.png",
      "secure_url": "https://res.cloudinary.com/dmddfnsun/image/upload/v1772881967/domrov-pictures/domrov-pictures/1772881965_448.png",
      "asset_folder": "domrov-pictures",
      "display_name": "1772881965_448",
      "original_filename": "Screenshot 2025-08-01 143740",
      "api_key": "617577115125841"
    }
    \`\`\`

    **Key Properties:**
    - \`secure_url\`: HTTPS URL for the uploaded image (recommended for production)
    - \`public_id\`: Unique identifier for the image in your Cloudinary account
    - \`asset_id\`: Cloudinary's internal asset identifier
    - \`width\`, \`height\`: Image dimensions in pixels
    - \`bytes\`: File size in bytes
    - \`format\`: Image format (png, jpg, etc.)
    - \`created_at\`: Upload timestamp in ISO format
    `
  })
  @ApiOkResponse({
    description: 'Presigned URL parameters for Cloudinary upload',
    schema: {
      example: {
        success: true,
        data: {
          signature: 'b0b6ab42079c788dc71bf64776575d423db5087b',
          timestamp: 1772881860,
          folder: 'domrov-pictures',
          public_id: 'domrov-pictures/1772881860_781',
          cloud_name: 'dmddfnsun',
          api_key: '617577115125841'
        }
      }
    }
  })
  async getPresignedUrlForCloudinary() {
    try {
      const data = await this.fileService.getPresignedUrlForCloudinary();
      return { success: true, data };
    } catch (err) {
      throw new NotFoundException('Failed to generate Cloudinary presigned URL');
    }
  }
}