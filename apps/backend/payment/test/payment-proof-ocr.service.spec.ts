import { ConfigService } from '@nestjs/config';
import { PaymentProofOcrService } from '../src/payment-proof-ocr.service';

describe('receipt hash extraction', () => {
  const service = new PaymentProofOcrService(new ConfigService());
  afterEach(() => jest.restoreAllMocks());

  it('extracts the receipt hash without treating the payer name as another hash', async () => {
    jest.spyOn(service as any, 'recognize').mockResolvedValue(
      'DOMROV 1.00 $\n: 9d94fdb3\nPHY VATHANAK\n078 569 811\nACLEDA Bank Plc.\n63243845138',
    );
    await expect(service.extractShortHash(Buffer.from('receipt'))).resolves.toBe('9d94fdb3');
  });

  it('normalizes uppercase OCR and repeated mixed-case hashes to lowercase', async () => {
    jest.spyOn(service as any, 'recognize').mockResolvedValue('9D94FDB3 9d94fdb3');
    await expect(service.extractShortHash(Buffer.from('receipt'))).resolves.toBe('9d94fdb3');
  });

  it('does not extract part of a longer transaction or account number', async () => {
    jest.spyOn(service as any, 'recognize').mockResolvedValue('VATHANAK 63243845138 abc9d94fdb3def');
    await expect(service.extractShortHash(Buffer.from('receipt'))).rejects.toThrow('Could not confidently read');
  });

  it('rejects genuinely ambiguous receipts rather than choosing a transaction', async () => {
    jest.spyOn(service as any, 'recognize').mockResolvedValue('9d94fdb3 1234abcd');
    await expect(service.extractShortHash(Buffer.from('receipt'))).rejects.toThrow('Could not confidently read');
  });
});
