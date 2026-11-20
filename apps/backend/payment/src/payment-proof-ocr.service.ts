import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
// Transaction hashes use hexadecimal characters. Ordinary eight-letter names
// such as VATHANAK must not become competing transaction candidates.
// Alphanumeric lookarounds prevent taking 8 characters from a longer number/ID.
const SHORT_HASH_PATTERN = /(?<![A-Z0-9])[A-F0-9]{8}(?![A-Z0-9])/gi;

@Injectable()
export class PaymentProofOcrService {
  constructor(private readonly config: ConfigService) {}

  async storeReceipt(paymentId: string, image: Buffer) {
    if (!/^[a-f0-9-]{36}$/i.test(paymentId)) throw new BadRequestException('Invalid payment ID');
    if (!image?.length || image.length > MAX_PROOF_BYTES) throw new BadRequestException('Receipt must be between 1 byte and 5 MB');
    const extension = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
      : image.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'jpg'
      : image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!extension) throw new BadRequestException('Upload a valid JPG, PNG, or WebP receipt');
    const key = `payment-receipts/${paymentId}/${randomUUID()}.${extension}`;
    const destination = resolve(this.config.get<string>('LOCAL_FILE_ROOT') || '/data/files', 'permanent', key);
    const temporary = `${destination}.upload`;
    try {
      await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
      await writeFile(temporary, image, { flag: 'wx', mode: 0o640 });
      await rename(temporary, destination);
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw new ServiceUnavailableException('Receipt could not be saved. Check the payment storage mount and write permissions.');
    }
    return { key, size: image.length, sha256: createHash('sha256').update(image).digest('hex'), uploadedAt: new Date().toISOString() };
  }

  async extractShortHash(image: Buffer): Promise<string> {
    if (!image?.length || image.length > MAX_PROOF_BYTES) {
      throw new BadRequestException('Payment receipt image must be between 1 byte and 5 MB');
    }

    const text = await this.recognize(image);
    const candidates = [...text.matchAll(SHORT_HASH_PATTERN)].map((match) => match[0].toLowerCase());
    const unique = [...new Set(candidates)];
    if (unique.length !== 1) {
      throw new BadRequestException('Could not confidently read one 8-character Bakong short hash from the receipt');
    }
    return unique[0];
  }

  private recognize(image: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('tesseract', ['stdin', 'stdout', '-l', 'eng', '--psm', '6'], { stdio: ['pipe', 'pipe', 'pipe'] });
      const output: Buffer[] = [];
      const errors: Buffer[] = [];
      let outputBytes = 0;
      const timer = setTimeout(() => process.kill('SIGKILL'), 15_000);
      process.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > 64 * 1024) process.kill('SIGKILL');
        else output.push(chunk);
      });
      process.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
      process.once('error', () => {
        clearTimeout(timer);
        reject(new ServiceUnavailableException('Receipt OCR is unavailable on the payment service'));
      });
      process.once('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new BadRequestException(errors.length ? 'Could not read the uploaded receipt image' : 'Receipt OCR failed'));
          return;
        }
        resolve(Buffer.concat(output).toString('utf8'));
      });
      process.stdin.end(image);
    });
  }
}
