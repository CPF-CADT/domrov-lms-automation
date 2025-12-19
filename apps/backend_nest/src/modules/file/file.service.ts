import { Injectable } from '@nestjs/common';

@Injectable()
export class FileService {
    async mockUploadFile(file: Express.Multer.File): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const uniqueId = Date.now();
        const sanitizedName = file.originalname.replace(/\s+/g, '-');
        return `https://domrov.com/${uniqueId}/${sanitizedName}`;
    }
}
