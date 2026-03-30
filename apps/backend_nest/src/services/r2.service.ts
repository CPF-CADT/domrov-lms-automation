import { Injectable, NotFoundException } from '@nestjs/common';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { MAX_FILE_SIZE } from '../libs/const/system';
import { Readable } from 'stream';

@Injectable()
export class R2Service {
  private s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get('R2_ACCOUNT_ID');
    const token = this.configService.get<string>('R2_TOKEN');
    const secretKey = this.configService.get<string>('R2_SECRET_KEY');
    const bucket = this.configService.get<string>('R2_BUCKET');

    if (!accountId || !token || !secretKey || !bucket) {
      console.error('R2 configuration missing:', {
        accountId: !!accountId,
        token: !!token,
        secretKey: !!secretKey,
        bucket: !!bucket,
      });
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: token!,
        secretAccessKey: secretKey!,
      },
      forcePathStyle: true,
    });
  }

  async getUploadUrl(key: string, contentType: string) {
    try {
      if (!key || !contentType) throw new NotFoundException('Key and content type are required');
      const bucket = this.configService.get<string>('R2_BUCKET');
      if (!bucket) throw new NotFoundException('R2 bucket not configured');
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        // ContentLength: MAX_FILE_SIZE
      });
      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
      return { uploadUrl, key };
    } catch (err: any) {
      console.error('Error generating upload URL:', err);
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Failed to get upload URL: ${err.message}`);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      if (!key) return false;
      const bucket = this.configService.get<string>('R2_BUCKET');
      if (!bucket) return false;
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  async streamFile(key: string): Promise<{ stream: Readable; contentType: string }> {
    try {
      if (!key) throw new NotFoundException('Key is required');
      const bucket = this.configService.get<string>('R2_BUCKET') || process.env.R2_BUCKET;
      if (!bucket) throw new NotFoundException('R2 bucket not configured');
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const r2Object = await this.s3.send(command);
      if (!r2Object.Body) throw new NotFoundException('File not found');
      let stream: Readable;
      if (r2Object.Body instanceof Readable) {
        stream = r2Object.Body;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of r2Object.Body as any) {
          chunks.push(Buffer.from(chunk));
        }
        stream = Readable.from(Buffer.concat(chunks));
      }
      return {
        stream,
        contentType: r2Object.ContentType || 'application/octet-stream',
      };
    } catch (err: any) {
      console.error('Error streaming file:', err);
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Failed to stream file: ${err.message}`);
    }
  }


}