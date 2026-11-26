import { BadRequestException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from './logging';

interface KhqrResult {
  status?: { code: number; message?: string };
  data?: { qr: string; md5: string };
}

interface BakongKhqrSdk {
  BakongKHQR: {
    new (): {
      generateIndividual(info: unknown): KhqrResult;
      generateMerchant(info: unknown): KhqrResult;
    };
    verify(qr: string): { isValid: boolean };
  };
  IndividualInfo: new (accountId: string, name: string, city: string, optionalData: Record<string, unknown>) => unknown;
  MerchantInfo: new (accountId: string, name: string, city: string, merchantId: string, acquiringBank: string, optionalData: Record<string, unknown>) => unknown;
  khqrData: { currency: { usd: unknown; khr: unknown } };
}

const khqrSdk = require('bakong-khqr') as BakongKhqrSdk;

export type PaymentCurrency = 'USD' | 'KHR';
export interface BakongTransaction { hash: string; fromAccountId: string; toAccountId: string; currency: PaymentCurrency; amount: number | string; description: string; createdDateMs: number; acknowledgedDateMs: number; }
export interface BakongResponse { responseCode: number; responseMessage: string; errorCode?: number; data?: BakongTransaction; }
export interface PaymentQr { qr: string; md5: string; }

/** Bakong adapter. Mock mode is never allowed to issue payable QR codes. */
@Injectable()
export class BakongProvider {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly mode: 'live' | 'mock';
  private readonly accountType: 'individual' | 'merchant';
  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('BAKONG_API_URL') ?? config.get<string>('BAKONG_API') ?? '';
    this.token = config.get<string>('BAKONG_TOKEN') ?? '';
    const configuredMode = config.get<string>('BAKONG_MODE') ?? 'mock';
    if (configuredMode !== 'live' && configuredMode !== 'mock') throw new Error('BAKONG_MODE must be live or mock');
    if (configuredMode === 'live' && (!this.apiUrl || !this.token)) {
      throw new Error('Live Bakong mode requires BAKONG_API_URL and BAKONG_TOKEN');
    }
    this.mode = configuredMode;
    const accountType = config.get<string>('BAKONG_ACCOUNT_TYPE') ?? 'individual';
    if (accountType !== 'individual' && accountType !== 'merchant') throw new Error('BAKONG_ACCOUNT_TYPE must be individual or merchant');
    this.accountType = accountType;
  }
  get currentMode(): 'live' | 'mock' { return this.mode; }
  createPaymentQr(input: { paymentId: string; amount: number; currency: PaymentCurrency }): PaymentQr {
    if (this.mode !== 'live') {
      throw new ServiceUnavailableException('Real KHQR payments require BAKONG_MODE=live and valid Bakong API credentials');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new BadRequestException('Amount must be positive');
    if (input.currency !== 'USD' && input.currency !== 'KHR') throw new BadRequestException('Unsupported payment currency');
    const accountId = this.config.get<string>('BAKONG_BANK_ACCOUNT')?.trim();
    if (!accountId) throw new ServiceUnavailableException('Set BAKONG_BANK_ACCOUNT to your registered Bakong account ID');

    const optionalData: Record<string, unknown> = {
      currency: input.currency === 'USD' ? khqrSdk.khqrData.currency.usd : khqrSdk.khqrData.currency.khr,
      amount: input.amount,
      // KHQR bill numbers are limited to 25 characters; payment UUIDs are 36.
      billNumber: input.paymentId.replace(/-/g, '').slice(0, 25),
      merchantCategoryCode: '5999',
      expirationTimestamp: Date.now() + 10 * 60 * 1000,
    };
    const phoneNumber = this.config.get<string>('PHONE_NUMBER')?.trim();
    if (phoneNumber) optionalData.mobileNumber = phoneNumber;

    const merchantName = this.config.get<string>('MERCHANT_NAME')?.trim() || 'DOMROV';
    const merchantCity = this.config.get<string>('MERCHANT_CITY')?.trim() || 'PHNOM PENH';
    const sdk = new khqrSdk.BakongKHQR();
    let result: KhqrResult;
    try {
      if (this.accountType === 'merchant') {
        const merchantId = this.config.get<string>('BAKONG_MERCHANT_ID')?.trim();
        const acquiringBank = this.config.get<string>('BAKONG_ACQUIRING_BANK')?.trim();
        if (!merchantId || !acquiringBank) {
          throw new ServiceUnavailableException('Merchant KHQR requires BAKONG_MERCHANT_ID and BAKONG_ACQUIRING_BANK');
        }
        const info = new khqrSdk.MerchantInfo(accountId, merchantName, merchantCity, merchantId, acquiringBank, optionalData);
        result = sdk.generateMerchant(info);
      } else {
        const info = new khqrSdk.IndividualInfo(accountId, merchantName, merchantCity, optionalData);
        result = sdk.generateIndividual(info);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      logger.warn('payment.provider', 'KHQR SDK rejected payment generation', {
        dependency: 'bakong', operation: 'generate_qr', outcome: 'rejected',
      });
      throw new BadRequestException('Could not generate KHQR. Check the Bakong account, merchant details and payment amount.');
    }

    if (result.status && result.status.code !== 0) {
      throw new BadRequestException(result.status.message || 'Bakong could not generate this KHQR');
    }
    const qr = result.data?.qr;
    const md5 = result.data?.md5;
    if (!qr || !md5 || !khqrSdk.BakongKHQR.verify(qr).isValid) {
      throw new BadRequestException('Bakong generated an invalid KHQR payload');
    }
    this.assertQrAmount(qr, input.amount, input.currency);
    return { qr, md5 };
  }
  private assertQrAmount(qr: string, amount: number, currency: PaymentCurrency): void {
    const payload = Buffer.from(qr, 'utf8');
    const fields = new Map<string, string>();
    for (let offset = 0; offset < payload.length;) {
      const header = payload.subarray(offset, offset + 4).toString('ascii');
      if (!/^\d{4}$/.test(header)) throw new BadRequestException('Invalid KHQR field');
      const length = Number(header.slice(2));
      const end = offset + 4 + length;
      if (end > payload.length) throw new BadRequestException('Invalid KHQR field length');
      fields.set(header.slice(0, 2), payload.subarray(offset + 4, end).toString('utf8'));
      offset = end;
    }
    if (fields.get('01') !== '12' || !fields.has('54') || Number(fields.get('54')) !== amount || fields.get('53') !== (currency === 'USD' ? '840' : '116')) {
      throw new BadRequestException('Generated KHQR does not match the package amount or currency');
    }
  }
  async checkPaymentByMd5(md5: string): Promise<BakongResponse> {
    if (!md5) throw new BadRequestException('MD5 is required');
    if (this.mode === 'mock') return this.mockResponse(md5);
    return this.post('/check_transaction_by_md5', { md5 });
  }
  async checkPaymentByHash(shortHash: string, expectedAmount: number, expectedCurrency: PaymentCurrency): Promise<BakongResponse> {
    if (!/^[A-Z0-9]{8}$/i.test(shortHash)) throw new BadRequestException('Hash must be exactly 8 alphanumeric characters');
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) throw new BadRequestException('Expected payment amount must be positive');
    if (expectedCurrency !== 'USD' && expectedCurrency !== 'KHR') throw new BadRequestException('Unsupported payment currency');
    if (this.mode === 'mock') {
      const paid = this.config.get<string>('BAKONG_MOCK_STATUS') === 'PAID' || shortHash.toLowerCase() === 'mockpaid';
      return paid ? this.successResponse(shortHash, expectedAmount, expectedCurrency) : { responseCode: 1, responseMessage: 'Transaction not found', errorCode: 1 };
    }
    // Bakong requires the expected package amount/currency as lookup parameters.
    // The response is still checked against these values before wallet credit.
    return this.post('/check_transaction_by_short_hash', { hash: shortHash.toLowerCase(), amount: expectedAmount, currency: expectedCurrency });
  }
  private mockResponse(md5: string): BakongResponse {
    return this.config.get<string>('BAKONG_MOCK_STATUS') === 'PAID' ? this.successResponse(md5.slice(0, 8), 1, 'USD') : { responseCode: 1, responseMessage: 'Transaction not found in mock sandbox', errorCode: 1 };
  }
  private successResponse(hash: string, amount: number, currency: PaymentCurrency): BakongResponse { const now = Date.now(); return { responseCode: 0, responseMessage: 'Getting transaction successfully.', data: { hash, fromAccountId: 'mock_sender@bakong', toAccountId: 'domrov@bakong', currency, amount, description: 'DOMROV mock payment', createdDateMs: now, acknowledgedDateMs: now } }; }
  private async post(
    path: '/check_transaction_by_short_hash' | '/check_transaction_by_md5',
    body: Record<string, unknown>,
  ): Promise<BakongResponse> {
    const started = performance.now();
    const operation = path === '/check_transaction_by_short_hash' ? 'lookup_short_hash' : 'lookup_md5';
    const fields = { dependency: 'bakong', operation };
    let statusCode: number | undefined;
    try {
      const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` }, body: JSON.stringify(body) });
      statusCode = response.status;
      const value = await response.json() as BakongResponse;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      logger.debug('payment.provider', 'Bakong lookup completed', {
        ...fields, outcome: 'completed', status_code: statusCode,
        duration_ms: performance.now() - started,
      });
      return value;
    } catch (error) {
      const cause = error instanceof Error ? error.cause as { code?: unknown } | undefined : undefined;
      const timedOut = error instanceof Error && (error.name === 'TimeoutError'
        || cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || cause?.code === 'UND_ERR_HEADERS_TIMEOUT'
        || cause?.code === 'UND_ERR_BODY_TIMEOUT' || cause?.code === 'ETIMEDOUT');
      logger.warn('payment.provider', 'Bakong lookup failed', {
        ...fields, outcome: timedOut ? 'timeout' : 'failed', status_code: statusCode,
        duration_ms: performance.now() - started,
      });
      throw new BadRequestException('Payment provider unavailable');
    }
  }
}
