import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { mkdtemp, readFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { LocalStorageService } from '../src/services/local-storage.service';

describe('LocalStorageService', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'local-storage-'));
    const config = { get: jest.fn().mockReturnValue(root) } as unknown as ConfigService;
    storage = new LocalStorageService(config);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('resolves valid application and team keys under the root', () => {
    expect(storage.getFilePath('42/module/7/notes.txt')).toBe(join(root, 'permanent/42/module/7/notes.txt'));
    expect(storage.getFilePath('Team9/submission/12/main.py')).toBe(join(root, 'permanent/Team9/submission/12/main.py'));
  });

  it.each(['../outside.txt', '42/../../outside.txt', '42/module/7/../notes.txt', '/tmp/outside.txt', 'C:\\tmp\\outside.txt', 'bad\0key'])
    ('rejects unsafe key %p', (key) => {
      expect(() => storage.getFilePath(key)).toThrow();
    });

  it('writes and reads a stream with safe permissions', async () => {
    const key = '42/module/7/notes.txt';

    await storage.saveFile(key, Readable.from(['hello local storage']));

    expect(await storage.fileExists(key)).toBe(true);
    expect(await readFile(storage.getFilePath(key), 'utf8')).toBe('hello local storage');
    expect((await stat(storage.getFilePath(key))).mode & 0o777).toBe(0o640);
    expect((await stat(join(root, 'permanent/42/module/7'))).mode & 0o777).toBe(0o750);

    const chunks: Buffer[] = [];
    for await (const chunk of storage.readFile(key)) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('hello local storage');
  });

  it('deletes files and reports missing files', async () => {
    const key = 'Team9/submission/12/main.py';
    await storage.saveFile(key, Readable.from(['print(1)']));

    await storage.deleteFile(key);
    await storage.deleteFile(key);

    expect(await storage.fileExists(key)).toBe(false);
  });

  it('reports storage health without exposing the filesystem path', async () => {
    const health = await storage.healthCheck();
    expect(health.exists).toBe(true);
    expect(health.readable).toBe(true);
    expect(health.writable).toBe(true);
    expect(health).not.toHaveProperty('root');
  });

  it('rejects writes when the configured capacity check fails', async () => {
    storage.healthCheck = jest.fn().mockResolvedValue({
      exists: true,
      readable: true,
      writable: true,
      freeBytes: 0,
      usedBytes: 0,
      enoughFreeSpace: false,
    });

    await expect(storage.assertCapacity(1)).rejects.toThrow('Insufficient local storage space');
  });
});
