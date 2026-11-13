import { ConflictException, Injectable, NotFoundException, BadRequestException, UnauthorizedException, Optional } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from './entities';
import { BakongProvider, PaymentCurrency } from './bakong.provider';
import { PaymentGateway } from './payment.gateway';
import { PaymentEventsPublisher } from './messaging/payment-events';

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
    @Optional() private readonly events?: PaymentEventsPublisher,
  ) {}

  async wallet(userId: string) { const wallet = await this.wallets.findOne({ where: { userId } }); return wallet ?? this.wallets.save(this.wallets.create({ userId, availableCredits: 0, reservedCredits: 0 })); }
  packagesList() { return this.packages.find({ where: { isActive: true }, order: { sortOrder: 'ASC', price: 'ASC' } }); }

  async adminListPackages() { return this.packages.find({ order: { sortOrder: 'ASC', price: 'ASC' } }); }

  async adminCreatePackage(input: { name: string; description?: string; credits: number; price: number; currency?: string; bonusCredits?: number; sortOrder?: number; isActive?: boolean }) {
    this.validatePackageInput(input);
    return this.packages.save(this.packages.create({ name: input.name.trim(), description: input.description?.trim(), credits: input.credits, price: input.price, currency: (input.currency ?? 'USD').toUpperCase(), bonusCredits: input.bonusCredits ?? 0, sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true }));
  }

  async adminUpdatePackage(id: string, input: Partial<{ name: string; description: string; credits: number; price: number; currency: string; bonusCredits: number; sortOrder: number; isActive: boolean }>) {
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    this.validatePackageInput({ ...pkg, ...input });
    Object.assign(pkg, input, input.currency ? { currency: input.currency.toUpperCase() } : {});
    return this.packages.save(pkg);
  }

  async adminTogglePackage(id: string) {
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    pkg.isActive = !pkg.isActive;
    return this.packages.save(pkg);
  }

  async adminDeletePackage(id: string) {
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    await this.packages.remove(pkg);
    return { id, deleted: true };
  }

  async adminAdjustWallet(input: { userId: string; amount: number; reason: string; description: string; adminId: string }, key: string) {
    if (!key?.trim()) throw new BadRequestException('Idempotency-Key is required');
    if (!input.userId || !Number.isFinite(input.amount) || input.amount === 0) throw new BadRequestException('A non-zero amount is required');
    if (!input.reason?.trim() || !input.description?.trim()) throw new BadRequestException('Reason and description are required');
    const existing = await this.idempotency.findOne({ where: { key } });
    if (existing) return existing.response;
    return this.dataSource.transaction(async manager => {
      let wallet = await manager.findOne(WalletBalance, { where: { userId: input.userId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) wallet = await manager.save(manager.create(WalletBalance, { userId: input.userId, availableCredits: 0, reservedCredits: 0 }));
      const before = Number(wallet.availableCredits);
      const after = before + input.amount;
      if (after < 0) throw new ConflictException('Insufficient credit balance');
      wallet.availableCredits = after;
      await manager.save(wallet);
      const transaction = await manager.save(manager.create(WalletTransaction, { userId: input.userId, amount: Math.abs(input.amount), type: input.amount > 0 ? 'credit' : 'debit', reason: input.reason.trim(), metadata: { adminAction: input.amount > 0 ? 'add_credits' : 'deduct_credits', adminId: input.adminId, description: input.description.trim(), balanceBefore: before, balanceAfter: after } }));
      const response = { id: transaction.id, userId: input.userId, amount: input.amount, creditBalance: after, balanceBefore: before, balanceAfter: after, type: transaction.type, reason: transaction.reason, description: input.description.trim(), status: 'completed' };
      await manager.save(manager.create(IdempotencyRecord, { key, operation: 'admin-wallet-adjustment', statusCode: 200, response }));
      return response;
    });
  }

  async adminListTransactions(input: { page?: number; limit?: number; transactionType?: string; userId?: string }) {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 10));
    const qb = this.transactions.createQueryBuilder('transaction');
    if (input.userId) qb.andWhere('transaction.user_id = :userId', { userId: input.userId });
    if (input.transactionType && input.transactionType !== 'all') {
      const types = input.transactionType === 'admin_adjustment' ? ['credit', 'debit'] : [input.transactionType];
      qb.andWhere('transaction.type IN (:...types)', { types });
    }
    const [items, total] = await qb.orderBy('transaction.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data: items.map(t => this.mapAdminTransaction(t)), total, page, limit };
  }

  async adminGetTransaction(id: string) {
    const transaction = await this.transactions.findOne({ where: { id } });
    if (transaction) return this.mapAdminTransaction(transaction);
    const payment = await this.payments.findOne({ where: { id } });
    if (payment) return { id: payment.id, userId: payment.userId, amount: Number(payment.amount), currency: payment.currency, status: payment.status === 'completed' ? 'paid' : payment.status, date: payment.createdAt, transactionType: 'payment', payment: { providerReference: payment.providerReference, providerMetadata: payment.providerMetadata, creditPackageId: payment.creditPackageId } };
    throw new NotFoundException('Transaction not found');
  }

  private mapAdminTransaction(transaction: WalletTransaction) {
    const metadata = transaction.metadata ?? {};
    return { id: transaction.id, userId: transaction.userId, amount: Number(transaction.amount), date: transaction.createdAt, transactionType: metadata.adminAction ? 'admin_adjustment' : transaction.type, adjustmentType: transaction.type, reason: transaction.reason, description: metadata.description, balanceBefore: metadata.balanceBefore, balanceAfter: metadata.balanceAfter, metadata };
  }

  private validatePackageInput(input: { name?: string; credits?: number; price?: number; currency?: string; bonusCredits?: number }) {
    if (!input.name?.trim() || !Number.isFinite(Number(input.credits)) || Number(input.credits) <= 0 || !Number.isFinite(Number(input.price)) || Number(input.price) < 0) throw new BadRequestException('Invalid credit package');
    if (input.currency && !/^[A-Za-z]{3}$/.test(input.currency)) throw new BadRequestException('Currency must be a 3-letter code');
    if (input.bonusCredits !== undefined && (!Number.isFinite(Number(input.bonusCredits)) || Number(input.bonusCredits) < 0)) throw new BadRequestException('Invalid bonus credits');
  }

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
    if (result.responseCode !== 0 || !result.data) { this.gateway.sendStatus(userId, 'UNPAID'); void this.events?.publish('payment.failed', { paymentId, userId, reason: 'unpaid' }, paymentId); return { paymentId, status: 'UNPAID' }; }
    if (Number(result.data.amount) !== Number(payment.amount) || result.data.currency !== payment.currency) throw new ConflictException('Payment amount or currency mismatch');
    await this.creditSuccessfulPayment(payment, result.data as unknown as Record<string, unknown>);
    this.gateway.sendStatus(userId, 'PAID');
    void this.events?.publish('payment.completed', { paymentId, userId, amount: Number(payment.amount), currency: payment.currency }, paymentId);
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
      const response = { reservationId: id, status }; await manager.save(manager.create(IdempotencyRecord, { key, operation: `${status}-credits`, statusCode: 200, response })); void this.events?.publish(`credit.${status === 'committed' ? 'committed' : 'released'}`, { reservationId: id, userId: reservation.userId, amount: Number(reservation.amount), referenceId: reservation.referenceId }, id); return response;
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
