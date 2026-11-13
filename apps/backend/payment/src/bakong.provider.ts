import { createHash } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PaymentCurrency = 'USD' | 'KHR';
export interface BakongTransaction { hash: string; fromAccountId: string; toAccountId: string; currency: PaymentCurrency; amount: number; description: string; createdDateMs: number; acknowledgedDateMs: number; }
export interface BakongResponse { responseCode: number; responseMessage: string; errorCode?: number; data?: BakongTransaction; }
export interface PaymentQr { qr: string; md5: string; }

/** Bakong adapter. Missing credentials intentionally select deterministic mock mode. */
@Injectable()
export class BakongProvider {
  private readonly logger = new Logger(BakongProvider.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly mode: 'live' | 'mock';
  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('BAKONG_API_URL') ?? config.get<string>('BAKONG_API') ?? '';
    this.token = config.get<string>('BAKONG_TOKEN') ?? '';
    this.mode = config.get<string>('BAKONG_MODE') === 'live' && !!this.apiUrl && !!this.token ? 'live' : 'mock';
  }
  get currentMode(): 'live' | 'mock' { return this.mode; }
  createPaymentQr(input: { paymentId: string; amount: number; currency: PaymentCurrency }): PaymentQr {
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new BadRequestException('Amount must be positive');
    const qr = this.createQr({ bankAccount: this.config.get<string>('BAKONG_BANK_ACCOUNT') ?? 'domrov@bakong', merchantName: this.config.get<string>('MERCHANT_NAME') ?? 'DOMROV', merchantCity: this.config.get<string>('MERCHANT_CITY') ?? 'PHNOM PENH', phoneNumber: this.config.get<string>('PHONE_NUMBER') ?? '', billNumber: input.paymentId, amount: input.amount, currency: input.currency });
    return { qr, md5: createHash('md5').update(qr, 'utf8').digest('hex') };
  }
  async checkPaymentByMd5(md5: string): Promise<BakongResponse> {
    if (!md5) throw new BadRequestException('MD5 is required');
    if (this.mode === 'mock') return this.mockResponse(md5);
    return this.post('/check_transaction_by_md5', { md5 });
  }
  async checkPaymentByHash(hash: string, amount: number, currency: PaymentCurrency): Promise<BakongResponse> {
    if (!hash || hash.length !== 8) throw new BadRequestException('Hash must be exactly 8 characters');
    if (this.mode === 'mock') {
      const paid = this.config.get<string>('BAKONG_MOCK_STATUS') === 'PAID' || hash.toLowerCase() === 'mockpaid';
      return paid ? this.successResponse(hash, amount, currency) : { responseCode: 1, responseMessage: 'Transaction not found', errorCode: 1 };
    }
    return this.post('/check_transaction_by_short_hash', { hash, amount, currency });
  }
  private mockResponse(md5: string): BakongResponse {
    return this.config.get<string>('BAKONG_MOCK_STATUS') === 'PAID' ? this.successResponse(md5.slice(0, 8), 1, 'USD') : { responseCode: 1, responseMessage: 'Transaction not found in mock sandbox', errorCode: 1 };
  }
  private successResponse(hash: string, amount: number, currency: PaymentCurrency): BakongResponse { const now = Date.now(); return { responseCode: 0, responseMessage: 'Getting transaction successfully.', data: { hash, fromAccountId: 'mock_sender@bakong', toAccountId: 'domrov@bakong', currency, amount, description: 'DOMROV mock payment', createdDateMs: now, acknowledgedDateMs: now } }; }
  private async post(path: string, body: Record<string, unknown>): Promise<BakongResponse> {
    try { const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` }, body: JSON.stringify(body) }); const value = await response.json() as BakongResponse; if (!response.ok) throw new Error(`HTTP ${response.status}`); return value; }
    catch (error) { this.logger.warn(`Bakong provider unavailable: ${error instanceof Error ? error.message : String(error)}`); throw new BadRequestException('Payment provider unavailable'); }
  }
  private createQr(input: { bankAccount: string; merchantName: string; merchantCity: string; phoneNumber: string; billNumber: string; amount: number; currency: PaymentCurrency }): string {
    const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;
    const currencyCode = input.currency === 'USD' ? '840' : '116';
    let qr = tlv('00', '01') + '010212' + tlv('29', tlv('00', input.bankAccount)) + tlv('52', '5999') + tlv('58', 'KH') + tlv('59', input.merchantName) + tlv('60', input.merchantCity);
    qr += tlv('54', input.amount.toFixed(2).replace(/\.?0+$/, '')) + tlv('53', currencyCode);
    qr += tlv('62', tlv('01', input.billNumber) + (input.phoneNumber ? tlv('02', input.phoneNumber) : ''));
    let crc = 0xffff; for (const byte of Buffer.from(`${qr}6304`, 'utf8')) { crc ^= byte << 8; for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff; }
    return `${qr}6304${crc.toString(16).toUpperCase().padStart(4, '0')}`;
  }
}
