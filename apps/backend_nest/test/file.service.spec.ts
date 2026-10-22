import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { MAX_FILE_SIZE } from '../src/libs/const/system';
import { ResourceType } from '../src/libs/enums/Resource';
import { FileService } from '../src/modules/file/file.service';

describe('FileService local uploads', () => {
  let service: FileService;
  let resourceRepo: any;
  let localStorage: any;
  let submissionService: any;
  let classPermission: any;
  let assessmentPermission: any;

  beforeEach(() => {
    resourceRepo = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: value.id || 10, ...value })),
    };
    localStorage = {
      assertCapacity: jest.fn(),
      saveFile: jest.fn(),
      fileExists: jest.fn(),
      readFile: jest.fn(),
    };
    submissionService = {
      getAssessmentBySubmissionId: jest.fn(),
      isSubmissionAccessibleByUser: jest.fn(),
    };
    classPermission = { isInstructorOfClass: jest.fn() };
    assessmentPermission = { isInstructorOfAssessmentClass: jest.fn() };

    service = new FileService(
      {} as any,
      resourceRepo,
      {} as any,
      submissionService,
      {} as any,
      localStorage,
      classPermission,
      assessmentPermission,
    );
  });

  it('uploads a file using the existing relative key and records metadata', async () => {
    classPermission.isInstructorOfClass.mockResolvedValue(true);

    const result = await service.uploadFile(7, {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      size: 5,
      buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4);

    expect(localStorage.saveFile).toHaveBeenCalledWith('7/class/4/notes.txt', expect.anything());
    expect(resourceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      url: '7/class/4/notes.txt',
      owner: '7',
      storageProvider: 'local',
      contentType: 'text/plain',
      size: 5,
      checksum: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      type: ResourceType.DOCUMENT,
    }));
    expect(result).toMatchObject({
      resourceId: 10,
      key: '7/class/4/notes.txt',
      originalFilename: 'notes.txt',
      contentType: 'text/plain',
      size: 5,
    });
  });

  it('accepts PowerPoint MIME types', async () => {
    classPermission.isInstructorOfClass.mockResolvedValue(true);

    await expect(service.uploadFile(7, {
      originalname: 'slides.pptx',
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: 5,
      buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4)).resolves.toMatchObject({
      key: '7/class/4/slides.pptx',
      resourceId: 10,
    });
  });

  it('updates an existing resource for a duplicate key', async () => {
    classPermission.isInstructorOfClass.mockResolvedValue(true);
    const existing = { id: 22, url: '7/class/4/notes.txt', owner: '7' };
    resourceRepo.findOne.mockResolvedValue(existing);

    const result = await service.uploadFile(7, {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      size: 5,
      buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4);

    expect(resourceRepo.create).not.toHaveBeenCalled();
    expect(resourceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 22 }));
    expect(result.resourceId).toBe(22);
  });

  it('rejects invalid MIME types, oversized files, and traversal filenames', async () => {
    classPermission.isInstructorOfClass.mockResolvedValue(true);

    await expect(service.uploadFile(7, {
      originalname: 'notes.txt', mimetype: 'application/pdf', size: 5, buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4)).rejects.toThrow('MIME type');

    await expect(service.uploadFile(7, {
      originalname: 'notes.txt', mimetype: 'text/plain', size: MAX_FILE_SIZE + 1, buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4)).rejects.toThrow('limit');

    await expect(service.uploadFile(7, {
      originalname: '../notes.txt', mimetype: 'text/plain', size: 5, buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 4)).rejects.toThrow('filename');

    expect(localStorage.saveFile).not.toHaveBeenCalled();
  });

  it('requires parent ownership before saving', async () => {
    classPermission.isInstructorOfClass.mockResolvedValue(false);

    await expect(service.uploadFile(7, {
      originalname: 'notes.txt', mimetype: 'text/plain', size: 5, buffer: Buffer.from('hello'),
    } as Express.Multer.File, 'class', 999)).rejects.toBeInstanceOf(ForbiddenException);

    expect(localStorage.saveFile).not.toHaveBeenCalled();
  });

  it('reads local resources during download', async () => {
    const stream = { pipe: jest.fn() };
    resourceRepo.findOne.mockResolvedValue({
      id: 10,
      title: 'notes.txt',
      owner: '7',
      url: '7/class/4/notes.txt',
      type: ResourceType.DOCUMENT,
      storageProvider: 'local',
      contentType: 'text/plain',
    });
    localStorage.fileExists.mockResolvedValue(true);
    localStorage.readFile.mockReturnValue(stream);

    const result = await service.getResourceStream(7, 10);

    expect(localStorage.readFile).toHaveBeenCalledWith('7/class/4/notes.txt');
    expect(result).toEqual({ stream, filename: 'notes.txt', contentType: 'text/plain' });
  });
});
