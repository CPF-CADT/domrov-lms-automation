import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageProviderName = 'local' | 'r2';

export interface StoredObjectMetadata {
  key: string;
  contentType?: string;
  size?: number;
}

export interface StorageAdapter {
  readonly name: StorageProviderName;
  save(key: string, body: NodeJS.ReadableStream, metadata: StoredObjectMetadata): Promise<void>;
  exists(key: string): Promise<boolean>;
  head(key: string): Promise<StoredObjectMetadata>;
  stream(key: string): Promise<{ stream: Readable; contentType: string; size?: number }>;
  createUploadUrl(key: string, contentType: string): Promise<string>;
}

function assertSafeKey(key: string): void {
  if (!key || key.includes('\0') || key.includes('\\') || isAbsolute(key) || win32.isAbsolute(key) || key.split('/').includes('..')) {
    throw new Error('Storage key must be a safe relative path');
  }
}

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local' as const;
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('LOCAL_FILE_ROOT') ?? process.env.LOCAL_FILE_ROOT ?? '/data/files', 'permanent');
  }

  private path(key: string): string {
    assertSafeKey(key);
    const filePath = resolve(this.root, key);
    const fromRoot = relative(this.root, filePath);
    if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) throw new Error('Storage key escapes root');
    return filePath;
  }

  async save(key: string, body: NodeJS.ReadableStream): Promise<void> {
    const filePath = this.path(key);
    await fs.mkdir(dirname(filePath), { recursive: true, mode: 0o750 });
    const tempPath = join(dirname(filePath), `.${randomUUID()}.upload`);
    try {
      await pipeline(body, createWriteStream(tempPath, { flags: 'wx', mode: 0o640 }));
      await fs.rename(tempPath, filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try { await fs.access(this.path(key)); return true; } catch (error: any) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  }

  async head(key: string): Promise<StoredObjectMetadata> {
    const filePath = this.path(key);
    const stat = await fs.stat(filePath).catch(() => { throw new NotFoundException('File not found in storage'); });
    return { key, size: stat.size };
  }

  async stream(key: string) {
    const metadata = await this.head(key);
    return { stream: createReadStream(this.path(key)), contentType: 'application/octet-stream', size: metadata.size };
  }

  async createUploadUrl(key: string): Promise<string> {
    assertSafeKey(key);
    return `/api/academic/file/upload?key=${encodeURIComponent(key)}`;
  }
}

@Injectable()
export class R2StorageAdapter implements StorageAdapter {
  readonly name = 'r2' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const token = config.get<string>('R2_TOKEN');
    const secret = config.get<string>('R2_SECRET_KEY');
    this.bucket = config.get<string>('R2_BUCKET') ?? '';
    this.client = new S3Client({
      region: 'auto',
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      forcePathStyle: true,
      credentials: token && secret ? { accessKeyId: token, secretAccessKey: secret } : undefined,
    });
  }

  private ensureConfigured() { if (!this.bucket) throw new Error('R2 storage is not configured'); }

  async save(key: string, body: NodeJS.ReadableStream, metadata: StoredObjectMetadata): Promise<void> {
    this.ensureConfigured();
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body as any, ContentType: metadata.contentType }));
  }

  async exists(key: string): Promise<boolean> {
    try { await this.head(key); return true; } catch { return false; }
  }

  async head(key: string): Promise<StoredObjectMetadata> {
    this.ensureConfigured();
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return { key, contentType: result.ContentType, size: result.ContentLength };
  }

  async stream(key: string) {
    this.ensureConfigured();
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new NotFoundException('File not found in storage');
    return { stream: Readable.from(result.Body as any), contentType: result.ContentType ?? 'application/octet-stream', size: result.ContentLength };
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    this.ensureConfigured();
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
  }
}

@Injectable()
export class AcademicStorageService {
  readonly adapter: StorageAdapter;

  constructor(config: ConfigService, local: LocalStorageAdapter, r2: R2StorageAdapter) {
    const provider = (config.get<string>('STORAGE_PROVIDER') ?? 'local').toLowerCase();
    if (provider !== 'local' && provider !== 'r2') throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
    this.adapter = provider === 'r2' ? r2 : local;
  }

  get provider(): StorageProviderName { return this.adapter.name; }
  save(key: string, body: NodeJS.ReadableStream, metadata: StoredObjectMetadata) { return this.adapter.save(key, body, metadata); }
  exists(key: string) { return this.adapter.exists(key); }
  head(key: string) { return this.adapter.head(key); }
  stream(key: string) { return this.adapter.stream(key); }
  createUploadUrl(key: string, contentType: string) { return this.adapter.createUploadUrl(key, contentType); }

  createCloudinaryUploadParams(folder = 'domrov-pictures') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret) throw new Error('Cloudinary storage is not configured');
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${folder}/${timestamp}_${Math.floor(Math.random() * 1000)}`;
    const payload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHmac('sha1', secret).update(payload).digest('hex');
    return { signature, timestamp, folder, public_id: publicId, cloud_name: cloudName, api_key: apiKey };
  }
}
