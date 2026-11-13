import { ConflictException, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from './entities';
import { BakongProvider, PaymentCurrency } from './bakong.provider';
import { PaymentGateway } from './payment.gateway';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(WalletBalance) private readonly wallets: Repository<WalletBalance>,
    @InjectRepository(CreditPackage) private readonly packages: Repository<CreditPackage>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(CreditReservation) private readonly reservations: Repository<CreditReservation>,
    @InjectRepository(WalletTransaction) private readonly transactions: Repository<WalletTransaction>,
    @InjectRepository(IdempotencyRecord) private readonly idempotency: Repository<IdempotencyRecord>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly provider: BakongProvider,
    private readonly gateway: PaymentGateway,
  ) {}

  async wallet(userId: string) { const wallet = await this.wallets.findOne({ where: { userId } }); return wallet ?? this.wallets.save(this.wallets.create({ userId, availableCredits: 0, reservedCredits: 0 })); }
  packagesList() { return this.packages.find({ where: { isActive: true }, order: { sortOrder: 'ASC', price: 'ASC' } }); }

  async createPayment(userId: string, packageId: string, key: string) {
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    const pkg = await this.packages.findOne({ where: { id: packageId, isActive: true } }); if (!pkg) throw new NotFoundException('Credit package not found');
    const payment = await this.payments.save(this.payments.create({ userId, creditPackageId: packageId, amount: pkg.price, currency: pkg.currency, status: 'pending' }));
    const qr = this.provider.createPaymentQr({ paymentId: payment.id, amount: Number(pkg.price), currency: pkg.currency as PaymentCurrency });
    payment.providerReference = qr.md5;
    payment.providerMetadata = { mode: this.provider.currentMode, qr: qr.qr };
    await this.payments.save(payment);
    this.gateway.sendQr(userId, qr.qr);
    return this.saveIdempotency(key, 'create-payment', { id: payment.id, status: payment.status, qr: qr.qr, providerMode: this.provider.currentMode });
  }

  async verifyPayment(userId: string, paymentId: string) {
    const payment = await this.payments.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'completed') return { paymentId, status: 'PAID' };
    if (!payment.providerReference) throw new ConflictException('Payment provider reference is missing');
    const result = await this.provider.checkPaymentByMd5(payment.providerReference);
    if (result.responseCode !== 0 || !result.data) { this.gateway.sendStatus(userId, 'UNPAID'); return { paymentId, status: 'UNPAID' }; }
    if (Number(result.data.amount) !== Number(payment.amount) || result.data.currency !== payment.currency) throw new ConflictException('Payment amount or currency mismatch');
    await this.creditSuccessfulPayment(payment, result.data as unknown as Record<string, unknown>);
    this.gateway.sendStatus(userId, 'PAID');
    return { paymentId, status: 'PAID' };
  }

  async reserve(input: { userId: string; amount: number; referenceId: string }, key: string) {
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    if (input.amount <= 0) throw new BadRequestException('Amount must be positive');
    return this.dataSource.transaction(async manager => {
      let wallet = await manager.findOne(WalletBalance, { where: { userId: input.userId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) wallet = await manager.save(manager.create(WalletBalance, { userId: input.userId, availableCredits: 0, reservedCredits: 0 }));
      if (Number(wallet.availableCredits) < input.amount) throw new ConflictException('Insufficient credits');
      wallet.availableCredits = Number(wallet.availableCredits) - input.amount; wallet.reservedCredits = Number(wallet.reservedCredits) + input.amount; await manager.save(wallet);
      const reservation = await manager.save(manager.create(CreditReservation, { ...input, status: 'reserved', idempotencyKey: key }));
      await manager.save(manager.create(WalletTransaction, { userId: input.userId, amount: input.amount, type: 'reserve', reason: 'ai-evaluation', referenceId: input.referenceId }));
      const response = { reservationId: reservation.id, status: reservation.status, amount: Number(reservation.amount) };
      await manager.save(manager.create(IdempotencyRecord, { key, operation: 'reserve-credits', statusCode: 201, response })); return response;
    });
  }

  async transition(id: string, status: 'committed' | 'released', key: string) {
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    return this.dataSource.transaction(async manager => {
      const reservation = await manager.findOne(CreditReservation, { where: { id }, lock: { mode: 'pessimistic_write' } }); if (!reservation) throw new NotFoundException('Reservation not found');
      if (reservation.status === status) return { reservationId: id, status };
      if (reservation.status !== 'reserved') throw new ConflictException(`Reservation is already ${reservation.status}`);
      const wallet = await manager.findOne(WalletBalance, { where: { userId: reservation.userId }, lock: { mode: 'pessimistic_write' } }); if (!wallet) throw new NotFoundException('Wallet not found');
      wallet.reservedCredits = Math.max(0, Number(wallet.reservedCredits) - Number(reservation.amount)); if (status === 'released') wallet.availableCredits = Number(wallet.availableCredits) + Number(reservation.amount); await manager.save(wallet);
      reservation.status = status; await manager.save(reservation); await manager.save(manager.create(WalletTransaction, { userId: reservation.userId, amount: Number(reservation.amount), type: status, reason: 'ai-evaluation', referenceId: reservation.referenceId }));
      const response = { reservationId: id, status }; await manager.save(manager.create(IdempotencyRecord, { key, operation: `${status}-credits`, statusCode: 200, response })); return response;
    });
  }

  async refund(userId: string, amount: number, referenceId: string, key: string) { if (amount <= 0) throw new BadRequestException('Amount must be positive'); const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response; const wallet = await this.wallet(userId); wallet.availableCredits = Number(wallet.availableCredits) + amount; await this.wallets.save(wallet); const response = { userId, amount, status: 'refunded', referenceId }; await this.idempotency.save(this.idempotency.create({ key, operation: 'refund', statusCode: 200, response })); return response; }
  private async saveIdempotency(key: string, operation: string, response: Record<string, unknown>) { await this.idempotency.save(this.idempotency.create({ key, operation, statusCode: 201, response })); return response; }

  private async creditSuccessfulPayment(payment: Payment, transaction: Record<string, unknown>) {
    await this.dataSource.transaction(async manager => {
      const locked = await manager.findOne(Payment, { where: { id: payment.id }, lock: { mode: 'pessimistic_write' } });
      if (!locked || locked.status === 'completed') return;
      const pkg = await manager.findOne(CreditPackage, { where: { id: locked.creditPackageId } });
      if (!pkg) throw new NotFoundException('Credit package not found');
      let wallet = await manager.findOne(WalletBalance, { where: { userId: locked.userId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) wallet = await manager.save(manager.create(WalletBalance, { userId: locked.userId, availableCredits: 0, reservedCredits: 0 }));
      const credits = Number(pkg.credits) + Number(pkg.bonusCredits ?? 0);
      wallet.availableCredits = Number(wallet.availableCredits) + credits;
      await manager.save(wallet);
      await manager.save(manager.create(WalletTransaction, { userId: locked.userId, amount: credits, type: 'credit', reason: 'purchase', referenceId: locked.id, metadata: { paymentId: locked.id, providerTransaction: transaction } }));
      locked.status = 'completed';
      locked.providerMetadata = { ...(locked.providerMetadata ?? {}), transaction };
      locked.providerReference = String(transaction.hash ?? locked.providerReference);
      await manager.save(locked);
    });
  }
}

export function assertUser(requestUser: { sub?: string } | undefined): string { if (!requestUser?.sub) throw new UnauthorizedException('Invalid authenticated user'); return String(requestUser.sub); }
