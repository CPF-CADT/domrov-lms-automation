// cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async getPresignedUrl(folder = 'domrov-pictures') {
        const timestamp = Math.round(new Date().getTime() / 1000);

        const public_id = `${folder}/${timestamp}_${Math.floor(Math.random() * 1000)}`;

        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder, public_id },
            process.env.CLOUDINARY_API_SECRET,
        );

        return {
            signature,
            timestamp,
            folder,
            public_id,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
        };
    }
}