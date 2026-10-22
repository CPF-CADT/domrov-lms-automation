import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { MAX_STORAGE_QUOTA_BYTES, MIN_FREE_SPACE_BYTES } from '../libs/const/system';

/**
 * Local filesystem storage for keys that are persisted in the database.
 * Keys are always relative storage keys; filesystem paths never leave this class.
 */
@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;
  private readonly permanentRoot: string;

  constructor(private readonly configService: ConfigService) {
    const configuredRoot =
      this.configService.get<string>('LOCAL_FILE_ROOT') || process.env.LOCAL_FILE_ROOT || '/data/files';

    this.root = resolve(configuredRoot);
    this.permanentRoot = resolve(this.root, 'permanent');
  }

  async saveFile(key: string, stream: NodeJS.ReadableStream): Promise<void> {
    const filePath = this.getFilePath(key);
    const directory = dirname(filePath);
    await fs.mkdir(directory, { recursive: true, mode: 0o750 });

    const temporaryPath = join(directory, `.${randomUUID()}.upload`);
    try {
      await pipeline(stream, createWriteStream(temporaryPath, { flags: 'wx', mode: 0o640 }));
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async assertCapacity(bytes: number): Promise<void> {
    const health = await this.healthCheck();
    if (!health.readable || !health.writable || health.freeBytes < bytes + MIN_FREE_SPACE_BYTES) {
      throw new Error('Insufficient local storage space');
    }
    if (MAX_STORAGE_QUOTA_BYTES > 0 && health.usedBytes + bytes > MAX_STORAGE_QUOTA_BYTES) {
      throw new Error('Local storage quota exceeded');
    }
  }

  async healthCheck(): Promise<{
    exists: boolean;
    readable: boolean;
    writable: boolean;
    freeBytes: number;
    usedBytes: number;
    enoughFreeSpace: boolean;
  }> {
    await fs.mkdir(this.permanentRoot, { recursive: true, mode: 0o750 });
    let readable = true;
    let writable = true;
    try { await fs.access(this.root, fs.constants.R_OK); } catch { readable = false; }
    try { await fs.access(this.root, fs.constants.W_OK); } catch { writable = false; }
    const stat = await fs.statfs(this.root);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    const usedBytes = await this.directorySize(this.permanentRoot);
    return {
      exists: true,
      readable,
      writable,
      freeBytes,
      usedBytes,
      enoughFreeSpace: freeBytes >= MIN_FREE_SPACE_BYTES,
    };
  }

  private async directorySize(directory: string): Promise<number> {
    let total = 0;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) total += await this.directorySize(path);
      else if (entry.isFile()) total += (await fs.stat(path)).size;
    }
    return total;
  }

  readFile(key: string): Readable {
    return createReadStream(this.getFilePath(key));
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(key));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  getFilePath(key: string): string {
    if (!key || key.includes('\0')) {
      throw new Error('Storage key must be a non-empty path without null bytes');
    }

    // Storage keys use forward slashes. Reject backslashes too so a key cannot
    // become an absolute or traversing Windows path if this service is moved.
    if (key.includes('\\') || key.split('/').includes('..') || isAbsolute(key) || win32.isAbsolute(key)) {
      throw new Error('Storage key must be a relative path');
    }

    const filePath = resolve(this.permanentRoot, key);
    const pathFromRoot = relative(this.permanentRoot, filePath);
    if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
      throw new Error('Storage key escapes the configured storage root');
    }

    return filePath;
  }
}
