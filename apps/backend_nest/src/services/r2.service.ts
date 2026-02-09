import fs from 'fs';
import { S3 } from 'aws-sdk';
import { Readable } from 'stream';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY!;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY!;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3({
  endpoint: R2_ENDPOINT,
  accessKeyId: R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
  signatureVersion: 'v4',
});

/**
 * Upload a file to R2
 * @param file - File path, Buffer, or Readable stream
 * @param key - File name or path in R2 bucket
 * @param contentType - Optional MIME type (default: 'application/octet-stream')
 * @returns URL of the uploaded file
 */
export async function uploadToR2(
  file: string | Buffer | Readable,
  key: string,
  contentType: string = 'application/octet-stream',
): Promise<string> {
  let body: string | Buffer | Readable;

  if (typeof file === 'string') {
    body = fs.createReadStream(file);
  } else {
    body = file;
  }

  const params: S3.Types.PutObjectRequest = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) return reject(err);
      resolve(data.Location);
    });
  });
}
