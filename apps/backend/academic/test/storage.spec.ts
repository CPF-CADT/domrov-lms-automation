import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import { AcademicService } from '../src/academic.service';
import { AcademicStorageService, LocalStorageAdapter } from '../src/storage';

describe('Academic storage compatibility', () => {
  let root: string;
  let adapter: LocalStorageAdapter;
  let storage: AcademicStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'academic-storage-'));
    adapter = new LocalStorageAdapter({ get: jest.fn().mockReturnValue(root) } as unknown as ConfigService);
    storage = Object.create(AcademicStorageService.prototype) as AcademicStorageService;
    (storage as any).adapter = adapter;
  });

  afterEach(async () => fs.rm(root, { recursive: true, force: true }));

  it('saves, verifies, and streams local objects using safe keys', async () => {
    const key = 'user-1/submission-1/main.py';
    await storage.save(key, Readable.from(['print(1)']), { key, contentType: 'text/x-python', size: 8 });

    expect(await storage.exists(key)).toBe(true);
    expect(await storage.head(key)).toMatchObject({ key, size: 8 });
    const result = await storage.stream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of result.stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('print(1)');
    expect(result.contentType).toBe('application/octet-stream');
  });

  it('rejects traversal keys', async () => {
    await expect(storage.save('../outside.txt', Readable.from(['bad']), { key: '../outside.txt' })).rejects.toThrow();
  });

  it('persists notify-upload metadata only after the object exists', async () => {
    const key = 'user-1/class-1/notes.txt';
    await storage.save(key, Readable.from(['hello']), { key, contentType: 'text/plain', size: 5 });

    const resourceRepo = {
      findOneBy: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'resource-1', ...value })),
    };
    const service = Object.create(AcademicService.prototype) as AcademicService;
    (service as any).storage = storage;
    (service as any).resources = resourceRepo;

    const resource = await service.createResource({ key, filename: 'notes.txt', contentType: 'text/plain' }, 'user-1');
    expect(resource).toMatchObject({ id: 'resource-1', url: key, title: 'notes.txt', storageProvider: 'local', size: 5 });
    expect(resourceRepo.save).toHaveBeenCalled();

    await expect(service.createResource({ key: 'missing.txt', filename: 'missing.txt' }, 'user-1')).rejects.toThrow('File not found in storage');
  });

  it('returns a local upload endpoint instead of pretending it is an external presigned URL', async () => {
    const result = await storage.createUploadUrl('user-1/resource/a.txt', 'text/plain');
    expect(result).toContain('/api/academic/file/upload?key=');
  });
});
