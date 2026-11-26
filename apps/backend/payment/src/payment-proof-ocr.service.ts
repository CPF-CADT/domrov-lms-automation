import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { logger } from './logging';

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
    const started = performance.now();
    try {
      await mkdir(dirname(destination), { recursive: true, mode: 0o750 });
      await writeFile(temporary, image, { flag: 'wx', mode: 0o640 });
      await rename(temporary, destination);
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      logger.warn('payment.receipt_storage', 'Receipt storage failed', {
        dependency: 'filesystem', outcome: 'failed', duration_ms: performance.now() - started,
      });
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
      const started = performance.now();
      const child = spawn('tesseract', ['stdin', 'stdout', '-l', 'eng', '--psm', '6'], { stdio: ['pipe', 'pipe', 'pipe'] });
      const output: Buffer[] = [];
      let sawStderr = false;
      let failedToStart = false;
      let termination: 'timeout' | 'output_limit' | undefined;
      let outputBytes = 0;
      const timer = setTimeout(() => {
        termination ??= 'timeout';
        child.kill('SIGKILL');
      }, 15_000);
      child.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > 64 * 1024) {
          termination ??= 'output_limit';
          child.kill('SIGKILL');
        } else {
          output.push(chunk);
        }
      });
      child.stderr.on('data', () => { sawStderr = true; });
      child.once('error', () => {
        clearTimeout(timer);
        failedToStart = true;
        logger.warn('payment.receipt_ocr', 'Receipt OCR unavailable', {
          dependency: 'tesseract', outcome: 'unavailable', duration_ms: performance.now() - started,
        });
        reject(new ServiceUnavailableException('Receipt OCR is unavailable on the payment service'));
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (failedToStart) return;
        if (code !== 0) {
          logger.warn('payment.receipt_ocr', 'Receipt OCR failed', {
            dependency: 'tesseract', outcome: termination ?? 'failed', duration_ms: performance.now() - started,
          });
          reject(new BadRequestException(sawStderr ? 'Could not read the uploaded receipt image' : 'Receipt OCR failed'));
          return;
        }
        logger.debug('payment.receipt_ocr', 'Receipt OCR completed', {
          dependency: 'tesseract', outcome: 'completed', duration_ms: performance.now() - started,
        });
        resolve(Buffer.concat(output).toString('utf8'));
      });
      child.stdin.end(image);
    });
  }
}
