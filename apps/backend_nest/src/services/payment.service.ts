import { Injectable, HttpException } from '@nestjs/common';
import { createHash } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';

type Currency = 'USD' | 'KHR';

interface CreateQRParams {
    bankAccount?: string;
    merchantName?: string;
    merchantCity?: string;
    currency: Currency;
    amount?: number | string;
    storeLabel?: string;
    phoneNumber?: string;
    billNumber?: string;
    terminalLabel?: string;
    isStatic?: boolean;
}

interface DeeplinkResponse {
    responseCode: number;
    data?: { shortLink: string };
    message?: string;
}

interface CheckPaymentResponse {
    responseCode: number;
    data?: any;
    message?: string;
}

@Injectable()
export class PaymentService {
    private readonly token: string;
    private readonly apiUrl: string;
    private readonly defaultBank: string;
    private readonly defaultMerchantName: string;
    private readonly defaultMerchantCity: string;
    private readonly defaultPhone: string;

    constructor(private readonly http: HttpService, private readonly config: ConfigService) {
        this.token = this.config.get<string>('BAKONG_TOKEN') || '';
        this.apiUrl = this.config.get<string>('BAKONG_API') || '';
        this.defaultBank = this.config.get<string>('BAKONG_BANK_ACCOUNT') || '';
        this.defaultMerchantName = this.config.get<string>('MERCHANT_NAME') || '';
        this.defaultMerchantCity = this.config.get<string>('MERCHANT_CITY') || '';
        this.defaultPhone = this.config.get<string>('PHONE_NUMBER') || '';
    }

    // TLV helper (Tag-Length-Value)
    private tlv(tag: string, value: string): string {
        const length = String(value.length).padStart(2, '0');
        return `${tag}${length}${value}`;
    }

    // CRC16-CCITT
    private generateCrc(data: string): string {
        // CRITICAL FIX: The CRC must be calculated on the data + "6304"
        const dataToCrc = data + '6304';
        const buffer = Buffer.from(dataToCrc, 'utf-8');
        
        let crc = 0xffff;
        const poly = 0x1021;

        for (const byte of buffer) {
            crc ^= byte << 8;
            for (let i = 0; i < 8; i++) {
                crc = (crc & 0x8000 ? (crc << 1) ^ poly : crc << 1) & 0xffff;
            }
        }

        const hex = (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
        return '6304' + hex;
    }

    private getTimestamp(): string {
        const ts = Date.now().toString();
        // FIX: Timestamp must be nested in Tag 00 within Tag 99
        // Structure: 99 -> Length -> 00 -> Length -> Timestamp
        const nested = this.tlv('00', ts);
        return this.tlv('99', nested);
    }

    private formatAmount(amount: string | number): string {
        let amt = parseFloat(String(amount));
        if (isNaN(amt)) throw new Error('Invalid amount');
        let str = amt.toFixed(2).replace(/\.?0+$/, '');
        return this.tlv('54', str);
    }

    createQR(params: CreateQRParams): string {
        const bankAccount = params.bankAccount || this.defaultBank;
        const merchantName = params.merchantName || this.defaultMerchantName;
        const merchantCity = params.merchantCity || this.defaultMerchantCity;
        const currency = params.currency;
        const amount = params.amount;
        
        // Optional fields
        const storeLabel = params.storeLabel || '';
        const phoneNumber = params.phoneNumber || this.defaultPhone;
        const billNumber = params.billNumber || '';
        const terminalLabel = params.terminalLabel || '';
        const isStatic = params.isStatic || false;

        if (!isStatic && amount === undefined) throw new Error('Amount required for dynamic QR');

        const poi = isStatic ? '010211' : '010212';
        const currencyCode = currency === 'USD' ? '840' : '116';

        let qr = '';
        qr += this.tlv('00', '01'); // payload format
        qr += poi; // POI method

        // FIX: Merchant Account Information (Tag 29) needs to be nested
        // Structure: 29 -> Length -> 00 -> Length -> BankAccount
        const merchantAccountInfo = this.tlv('00', bankAccount);
        qr += this.tlv('29', merchantAccountInfo); 

        qr += this.tlv('52', '5999'); // MCC
        qr += this.tlv('58', 'KH'); // Country
        qr += this.tlv('59', merchantName); // Merchant Name
        qr += this.tlv('60', merchantCity); // City
        qr += this.getTimestamp(); // Timestamp (now includes nested fix)
        
        if (!isStatic && amount) {
            qr += this.formatAmount(amount);
        }
        
        qr += this.tlv('53', currencyCode); // Currency

        // Additional data field (Tag 62)
        let addl = '';
        if (billNumber) addl += this.tlv('01', billNumber);
        if (phoneNumber) addl += this.tlv('02', phoneNumber);
        if (storeLabel) addl += this.tlv('03', storeLabel);
        if (terminalLabel) addl += this.tlv('07', terminalLabel);

        if (addl) qr += this.tlv('62', addl);

        // Finalize with CRC
        qr += this.generateCrc(qr);
        
        return qr;
    }

    generateMD5(data: string): string {
        return createHash('md5').update(data, 'utf-8').digest('hex');
    }

    async generateDeeplink(qr: string): Promise<string | null> {
        const payload = {
            qr,
            sourceInfo: {
                appIconUrl: 'https://bakong.nbc.gov.kh/images/logo.svg',
                appName: 'MyApp',
                appDeepLinkCallback: 'https://callback.example.com',
            },
        };
        try {
            const res: AxiosResponse<DeeplinkResponse> = await firstValueFrom(
                this.http.post(`${this.apiUrl}/generate_deeplink_by_qr`, payload, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }),
            );
            return res.data?.data?.shortLink || null;
        } catch (err) {
            throw new HttpException(this.extractError(err), 400);
        }
    }

    async checkPayment(md5: string): Promise<'PAID' | 'UNPAID'> {
        try {
            const res: AxiosResponse<CheckPaymentResponse> = await firstValueFrom(
                this.http.post(`${this.apiUrl}/check_transaction_by_md5`, { md5 }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }),
            );
            return res.data?.responseCode === 0 ? 'PAID' : 'UNPAID';
        } catch (err) {
            throw new HttpException(this.extractError(err), 400);
        }
    }

    private extractError(err: any) {
        return err?.response?.data?.message || err?.message || 'Unknown error';
    }
}
