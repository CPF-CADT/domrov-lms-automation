import { Injectable } from '@nestjs/common';
import archiver from 'archiver';

@Injectable()
export class FileService {
  async mockUploadFile(file: Express.Multer.File): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const uniqueId = Date.now();
    const sanitizedName = file.originalname.replace(/\s+/g, '-');
    return `https://domrov.com/${uniqueId}/${sanitizedName}`;
  }

  // 2. Main entry point: Handles 1 file or Multiple files
  async uploadFiles(
    files: Array<Express.Multer.File>,
  ): Promise<{ url: string; filename: string } | null> {
    if (!files || files.length === 0) return null;

    let fileToUpload: Express.Multer.File;

    if (files.length === 1) {
      // If single file, use it directly
      fileToUpload = files[0];
    } else {
      // If multiple, compress them into one zip file
      fileToUpload = await this.compressFiles(files);
    }

    // Upload the resulting file (either original or zip)
    const url = await this.mockUploadFile(fileToUpload);

    return {
      url: url,
      filename: fileToUpload.originalname,
    };
  }
  private async compressFiles(
    files: Array<Express.Multer.File>,
  ): Promise<Express.Multer.File> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      // Listen for data chunks to build the final buffer
      archive.on('data', (data) => buffers.push(data));

      archive.on('error', (err) => reject(err));

      // When zipping is done
      archive.on('end', () => {
        const finalBuffer = Buffer.concat(buffers);
        const zipName = `resources_${Date.now()}.zip`;

        // Create a fake Multer File object
        const zipFile: any = {
          fieldname: 'file',
          originalname: zipName,
          encoding: '7bit',
          mimetype: 'application/zip',
          buffer: finalBuffer,
          size: finalBuffer.length,
        };

        resolve(zipFile);
      });

      // Add every file buffer to the archive
      for (const file of files) {
        archive.append(file.buffer, { name: file.originalname });
      }

      // Finalize the archive (triggers 'end' event)
      archive.finalize();
    });
  }
}
