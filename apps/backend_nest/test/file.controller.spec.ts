import { describe, expect, it, jest } from '@jest/globals';
import { FileController } from '../src/modules/file/file.controller';
import { FileService } from '../src/modules/file/file.service';

describe('FileController upload mapping', () => {
  it('forwards multipart file fields and authenticated user ID to the service', async () => {
    const fileService = {
      uploadFile: jest.fn().mockResolvedValue({
        resourceId: 10,
        key: '7/class/4/notes.txt',
        originalFilename: 'notes.txt',
        contentType: 'text/plain',
        size: 5,
        checksum: 'checksum',
      }),
    };
    const controller = new FileController(fileService as unknown as FileService);
    const file = {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello'),
      size: 5,
    } as Express.Multer.File;

    const response = await controller.upload(file, 'class', '4', 7);

    expect(response.data).toMatchObject({ resourceId: 10, key: '7/class/4/notes.txt' });
    expect(fileService.uploadFile).toHaveBeenCalledWith(7, file, 'class', 4);
  });
});
