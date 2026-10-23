import { FileService } from '../src/modules/file/file.service';

describe('FileService upload validation', () => {
  it('accepts ZIP uploads from browsers using the standard ZIP MIME type', () => {
    const service = Object.create(FileService.prototype) as FileService;

    expect((service as any).validateFile({
      originalname: 'submission.zip',
      mimetype: 'application/zip',
    })).toMatchObject({
      originalFilename: 'submission.zip',
      safeFilename: 'submission.zip',
      contentType: 'application/zip',
      extension: 'zip',
    });
  });
});
