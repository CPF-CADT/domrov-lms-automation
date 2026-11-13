import { ConfigService } from '@nestjs/config';
import { BakongProvider } from '../src/bakong.provider';

describe('BakongProvider', () => {
  function provider(values: Record<string, string> = {}) {
    return new BakongProvider({ get: jest.fn((key: string) => values[key]) } as unknown as ConfigService);
  }

  it('creates a valid deterministic mock QR and MD5 reference', () => {
    const first = provider().createPaymentQr({ paymentId: 'payment-1', amount: 2.5, currency: 'USD' });
    const second = provider().createPaymentQr({ paymentId: 'payment-1', amount: 2.5, currency: 'USD' });
    expect(first).toEqual(second);
    expect(first.qr).toMatch(/^000201/);
    expect(first.qr).toMatch(/6304[0-9A-F]{4}$/);
    expect(first.md5).toHaveLength(32);
  });

  it('uses deterministic sandbox status without live credentials', async () => {
    const unpaid = await provider().checkPaymentByMd5('0123456789abcdef0123456789abcdef');
    expect(unpaid.responseCode).toBe(1);
    const paid = await provider({ BAKONG_MOCK_STATUS: 'PAID' }).checkPaymentByMd5('0123456789abcdef0123456789abcdef');
    expect(paid.responseCode).toBe(0);
    expect(paid.data?.currency).toBe('USD');
  });

  it('supports deterministic short-hash verification hooks', async () => {
    const result = await provider().checkPaymentByHash('mockpaid', 5, 'KHR');
    expect(result.responseCode).toBe(0);
    expect(result.data).toMatchObject({ hash: 'mockpaid', amount: 5, currency: 'KHR' });
  });
});
