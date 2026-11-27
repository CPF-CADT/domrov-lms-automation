import { ConflictException, Injectable, NotFoundException, BadRequestException, UnauthorizedException, Optional, HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not, QueryFailedError, Repository } from 'typeorm';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from './entities';
import { BakongProvider, PaymentCurrency } from './bakong.provider';
import { PaymentGateway } from './payment.gateway';
import { PaymentEventsPublisher } from './messaging/payment-events';
import { PaymentProofOcrService } from './payment-proof-ocr.service';
import { logger } from './logging';

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
    private readonly proofOcr: PaymentProofOcrService,
    @Optional() private readonly events?: PaymentEventsPublisher,
  ) {}

  async wallet(userId: string) { const wallet = await this.wallets.findOne({ where: { userId } }); return wallet ?? this.wallets.save(this.wallets.create({ userId, availableCredits: 0, reservedCredits: 0 })); }
  packagesList() { return this.packages.find({ where: { isActive: true }, order: { sortOrder: 'ASC', price: 'ASC' } }); }
  async userTransactions(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await this.transactions.findAndCount({ where: { userId }, order: { createdAt: 'DESC' }, skip: (safePage - 1) * safeLimit, take: safeLimit });
    return { transactions: items, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async userPayments(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await this.payments.findAndCount({ where: { userId, status: Not('cancelled') }, order: { createdAt: 'DESC' }, skip: (safePage - 1) * safeLimit, take: safeLimit });
    return { payments: items.map(payment => this.mapUserPayment(payment)), pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async userPaymentStatus(userId: string, paymentId: string) {
    const payment = await this.payments.findOne({ where: { id: paymentId, userId, status: Not('cancelled') } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.mapUserPayment(payment);
  }

  async deletePendingPayment(userId: string, paymentId: string) {
    const started = performance.now();
    const response = await this.dataSource.transaction(async manager => {
      const payment = await manager.findOne(Payment, { where: { id: paymentId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === 'cancelled') return { id: paymentId, deleted: true };
      if (payment.status !== 'pending') throw new ConflictException('Only pending payments can be deleted');
      payment.status = 'cancelled';
      await manager.save(payment);
      return { id: paymentId, deleted: true };
    });
    logger.info('payment.cancel', 'Pending payment cancellation completed', { outcome: 'completed', duration_ms: performance.now() - started });
    return response;
  }

  private mapUserPayment(payment: Payment) {
    return {
      id: payment.id,
      packageName: payment.packageNameSnapshot ?? 'Credit package',
      amount: Number(payment.amount),
      currency: payment.currency,
      credits: Number(payment.creditsSnapshot ?? 0),
      status: payment.status === 'completed' ? 'paid' : payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async adminListPackages() { return this.packages.find({ order: { sortOrder: 'ASC', price: 'ASC' } }); }

  async adminCreatePackage(input: { name: string; description?: string; credits: number; price: number; currency?: string; bonusCredits?: number; sortOrder?: number; isActive?: boolean }) {
    const started = performance.now();
    this.validatePackageInput(input);
    const pkg = await this.packages.save(this.packages.create({ name: input.name.trim(), description: input.description?.trim(), credits: input.credits, price: input.price, currency: (input.currency ?? 'USD').toUpperCase(), bonusCredits: input.bonusCredits ?? 0, sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true }));
    logger.info('payment.package', 'Credit package created', { operation: 'create', outcome: 'completed', duration_ms: performance.now() - started });
    return pkg;
  }

  async adminUpdatePackage(id: string, input: Partial<{ name: string; description: string; credits: number; price: number; currency: string; bonusCredits: number; sortOrder: number; isActive: boolean }>) {
    const started = performance.now();
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    this.validatePackageInput({ ...pkg, ...input });
    Object.assign(pkg, input, input.currency ? { currency: input.currency.toUpperCase() } : {});
    const updated = await this.packages.save(pkg);
    logger.info('payment.package', 'Credit package updated', { operation: 'update', outcome: 'completed', duration_ms: performance.now() - started });
    return updated;
  }

  async adminTogglePackage(id: string) {
    const started = performance.now();
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    pkg.isActive = !pkg.isActive;
    const updated = await this.packages.save(pkg);
    logger.info('payment.package', 'Credit package status updated', { operation: 'toggle', outcome: 'completed', duration_ms: performance.now() - started });
    return updated;
  }

  async adminDeletePackage(id: string) {
    const started = performance.now();
    const pkg = await this.packages.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    await this.packages.remove(pkg);
    logger.info('payment.package', 'Credit package deleted', { operation: 'delete', outcome: 'completed', duration_ms: performance.now() - started });
    return { id, deleted: true };
  }

  async adminAdjustWallet(input: { userId: string; amount: number; reason: string; description: string; adminId: string }, key: string) {
    const started = performance.now();
    if (!key?.trim()) throw new BadRequestException('Idempotency-Key is required');
    if (!input.userId || !Number.isFinite(input.amount) || input.amount === 0) throw new BadRequestException('A non-zero amount is required');
    if (!input.reason?.trim() || !input.description?.trim()) throw new BadRequestException('Reason and description are required');
    const existing = await this.idempotency.findOne({ where: { key } });
    if (existing) return existing.response;
    const adjustment = await this.dataSource.transaction(async manager => {
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
    logger.info('payment.wallet_adjust', 'Wallet adjustment completed', { outcome: 'completed', duration_ms: performance.now() - started });
    return adjustment;
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
    const started = performance.now();
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    const pkg = await this.packages.findOne({ where: { id: packageId, isActive: true } }); if (!pkg) throw new NotFoundException('Credit package not found');
    const paymentId = randomUUID();
    const qr = this.provider.createPaymentQr({ paymentId, amount: Number(pkg.price), currency: pkg.currency as PaymentCurrency });
    const payment = await this.payments.save(this.payments.create({ id: paymentId, userId, creditPackageId: packageId, packageNameSnapshot: pkg.name, creditsSnapshot: Number(pkg.credits) + Number(pkg.bonusCredits ?? 0), amount: pkg.price, currency: pkg.currency, status: 'pending', providerReference: qr.md5, providerMetadata: { mode: this.provider.currentMode, qr: qr.qr } }));
    const response = await this.saveIdempotency(key, 'create-payment', {
      id: payment.id,
      status: payment.status,
      qr: qr.qr,
      packageName: payment.packageNameSnapshot,
      amount: Number(payment.amount),
      currency: payment.currency,
      credits: Number(payment.creditsSnapshot),
      providerMode: this.provider.currentMode,
    });
    logger.info('payment.create', 'Payment initialized', { outcome: 'completed', duration_ms: performance.now() - started });
    return response;
  }

  async verifyPaymentProof(userId: string, paymentId: string, image: Buffer) {
    const started = performance.now();
    const payment = await this.payments.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'completed') {
      this.gateway.sendStatus(userId, paymentId, 'PAID');
      return { paymentId, status: 'PAID' };
    }

    const claimed = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Payment, { where: { id: paymentId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw new NotFoundException('Payment not found');
      if (current.status === 'cancelled') throw new ConflictException('This payment has been deleted');
      if (current.status === 'completed') return 'completed';
      const retrying = current.status === 'verifying';
      if (retrying && Date.now() - current.updatedAt.getTime() < 2 * 60_000) {
        throw new ConflictException('A receipt for this payment is already being checked');
      }
      current.status = 'verifying';
      await manager.save(current);
      return retrying ? 'reclaimed' : 'claimed';
    });
    if (claimed === 'completed') {
      this.gateway.sendStatus(userId, paymentId, 'PAID');
      return { paymentId, status: 'PAID' };
    }
    if (claimed === 'reclaimed') {
      logger.info('payment.verify.retry', 'Stale receipt verification reclaimed', {
        outcome: 'retrying', duration_ms: performance.now() - started,
      });
    }

    this.gateway.sendStatus(userId, paymentId, 'VERIFYING');
    let operation = 'store_receipt';
    let errorCode: string | undefined;
    try {
      const receipt = await this.proofOcr.storeReceipt(paymentId, image);
      operation = 'record_receipt';
      await this.payments.update({ id: paymentId }, { providerMetadata: { ...(payment.providerMetadata ?? {}), receipt } });
      operation = 'receipt_ocr';
      const hash = await this.proofOcr.extractShortHash(image);
      const expectedAmount = Number(payment.amount);
      const expectedCurrency = payment.currency.toUpperCase() as PaymentCurrency;
      operation = 'provider_lookup';
      const result = await this.provider.checkPaymentByHash(hash, expectedAmount, expectedCurrency);
      operation = 'verify_match';
      if (result.responseCode !== 0 || !result.data) {
        await this.restorePending(paymentId);
        this.gateway.sendStatus(userId, paymentId, 'UNPAID', 'No matching completed Bakong transaction was found. Check the receipt and try again.');
        void this.events?.publish('payment.failed', { paymentId, userId, reason: 'transaction-not-found' }, `${paymentId}:unpaid`);
        logger.info('payment.verify', 'Payment receipt had no matching transaction', {
          outcome: 'not_found', duration_ms: performance.now() - started,
        });
        return { paymentId, status: 'UNPAID', extractedHash: hash };
      }
      const returnedAmount = Number(result.data.amount);
      const returnedCurrency = String(result.data.currency).toUpperCase();
      if (!Number.isFinite(returnedAmount) || returnedAmount !== expectedAmount || returnedCurrency !== expectedCurrency) {
        errorCode = 'amount_or_currency_mismatch';
        throw new ConflictException('Bakong transaction amount or currency does not match this package');
      }
      const returnedHash = String(result.data.hash ?? '').toLowerCase();
      if (returnedHash && returnedHash !== hash && !returnedHash.startsWith(hash)) {
        errorCode = 'hash_mismatch';
        throw new ConflictException('Bakong returned a different short hash than the uploaded receipt');
      }

      // Stored references contain the full Bakong hash, not the OCR short hash.
      const existingPayment = returnedHash
        ? await this.payments.findOne({ where: { providerReference: returnedHash } })
        : null;
      if (existingPayment && existingPayment.id !== paymentId) {
        errorCode = 'transaction_already_used';
        throw new ConflictException('This Bakong transaction has already been used for another payment. Upload a different receipt.');
      }

      operation = 'credit_wallet';
      await this.creditSuccessfulPayment(payment, result.data as unknown as Record<string, unknown>);
      this.gateway.sendStatus(userId, paymentId, 'PAID');
      void this.events?.publish('payment.completed', { paymentId, userId, amount: Number(payment.amount), currency: payment.currency }, paymentId);
      logger.info('payment.verify', 'Payment receipt verified', { outcome: 'completed', duration_ms: performance.now() - started });
      return { paymentId, status: 'PAID', extractedHash: hash };
    } catch (error) {
      const fields = {
        operation, outcome: 'failed',
        error_code: errorCode,
        status_code: error instanceof HttpException ? error.getStatus() : undefined,
        duration_ms: performance.now() - started,
      };
      if (errorCode || operation === 'credit_wallet' || operation === 'verify_match' || operation === 'record_receipt') {
        logger.exception('payment.verify', 'Payment receipt verification failed', error, fields, 'warn');
      } else {
        logger.debug('payment.verify', 'Payment receipt verification failed', fields);
      }
      await this.restorePending(paymentId);
      this.gateway.sendStatus(userId, paymentId, 'FAILED', error instanceof Error ? error.message : 'Receipt verification failed');
      throw error;
    }
  }

  private async restorePending(paymentId: string) {
    await this.payments.update({ id: paymentId, status: 'verifying' }, { status: 'pending' });
  }

  async reserve(input: { userId: string; amount: number; referenceId: string }, key: string) {
    const started = performance.now();
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    if (input.amount <= 0) throw new BadRequestException('Amount must be positive');
    const reservation = await this.dataSource.transaction(async manager => {
      let wallet = await manager.findOne(WalletBalance, { where: { userId: input.userId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) wallet = await manager.save(manager.create(WalletBalance, { userId: input.userId, availableCredits: 0, reservedCredits: 0 }));
      if (Number(wallet.availableCredits) < input.amount) throw new ConflictException('Insufficient credits');
      wallet.availableCredits = Number(wallet.availableCredits) - input.amount; wallet.reservedCredits = Number(wallet.reservedCredits) + input.amount; await manager.save(wallet);
      const reservation = await manager.save(manager.create(CreditReservation, { ...input, status: 'reserved', idempotencyKey: key }));
      await manager.save(manager.create(WalletTransaction, { userId: input.userId, amount: input.amount, type: 'reserve', reason: 'ai-evaluation', referenceId: input.referenceId }));
      const response = { reservationId: reservation.id, status: reservation.status, amount: Number(reservation.amount) };
      await manager.save(manager.create(IdempotencyRecord, { key, operation: 'reserve-credits', statusCode: 201, response })); return response;
    });
    logger.info('payment.credit_reservation', 'Credit reservation completed', {
      operation: 'reserve', outcome: 'completed', duration_ms: performance.now() - started,
    });
    return reservation;
  }

  async transition(id: string, status: 'committed' | 'released', key: string) {
    const started = performance.now();
    const existing = await this.idempotency.findOne({ where: { key } }); if (existing) return existing.response;
    const transition = await this.dataSource.transaction(async manager => {
      const reservation = await manager.findOne(CreditReservation, { where: { id }, lock: { mode: 'pessimistic_write' } }); if (!reservation) throw new NotFoundException('Reservation not found');
      if (reservation.status === status) return { reservationId: id, status };
      if (reservation.status !== 'reserved') throw new ConflictException(`Reservation is already ${reservation.status}`);
      const wallet = await manager.findOne(WalletBalance, { where: { userId: reservation.userId }, lock: { mode: 'pessimistic_write' } }); if (!wallet) throw new NotFoundException('Wallet not found');
      wallet.reservedCredits = Math.max(0, Number(wallet.reservedCredits) - Number(reservation.amount)); if (status === 'released') wallet.availableCredits = Number(wallet.availableCredits) + Number(reservation.amount); await manager.save(wallet);
      reservation.status = status; await manager.save(reservation); await manager.save(manager.create(WalletTransaction, { userId: reservation.userId, amount: Number(reservation.amount), type: status, reason: 'ai-evaluation', referenceId: reservation.referenceId }));
      const response = { reservationId: id, status }; await manager.save(manager.create(IdempotencyRecord, { key, operation: `${status}-credits`, statusCode: 200, response })); void this.events?.publish(`credit.${status === 'committed' ? 'committed' : 'released'}`, { reservationId: id, userId: reservation.userId, amount: Number(reservation.amount), referenceId: reservation.referenceId }, id); return response;
    });
    logger.info('payment.credit_reservation', 'Credit reservation status updated', {
      operation: status === 'committed' ? 'commit' : 'release', outcome: 'completed', duration_ms: performance.now() - started,
    });
    return transition;
  }

  async refund(userId: string, amount: number, referenceId: string, key: string) {
    const started = performance.now();
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const existing = await this.idempotency.findOne({ where: { key } });
    if (existing) return existing.response;
    const wallet = await this.wallet(userId);
    wallet.availableCredits = Number(wallet.availableCredits) + amount;
    await this.wallets.save(wallet);
    const response = { userId, amount, status: 'refunded', referenceId };
    await this.idempotency.save(this.idempotency.create({ key, operation: 'refund', statusCode: 200, response }));
    logger.info('payment.refund', 'Wallet credit refund completed', { outcome: 'completed', duration_ms: performance.now() - started });
    return response;
  }
  private async saveIdempotency(key: string, operation: string, response: Record<string, unknown>) { await this.idempotency.save(this.idempotency.create({ key, operation, statusCode: 201, response })); return response; }

  private async creditSuccessfulPayment(payment: Payment, transaction: Record<string, unknown>) {
    try {
      await this.dataSource.transaction(async manager => {
        const locked = await manager.findOne(Payment, { where: { id: payment.id }, lock: { mode: 'pessimistic_write' } });
        if (!locked || locked.status === 'completed') return;
        let wallet = await manager.findOne(WalletBalance, { where: { userId: locked.userId }, lock: { mode: 'pessimistic_write' } });
        if (!wallet) wallet = await manager.save(manager.create(WalletBalance, { userId: locked.userId, availableCredits: 0, reservedCredits: 0 }));
        // Old payments created before snapshots were introduced retain a safe
        // fallback; new payments always use the immutable checkout snapshot.
        const legacyPackage = locked.creditsSnapshot == null
          ? await manager.findOne(CreditPackage, { where: { id: locked.creditPackageId } })
          : null;
        if (locked.creditsSnapshot == null && !legacyPackage) throw new NotFoundException('Credit package not found for legacy payment');
        const credits = Number(locked.creditsSnapshot ?? (Number(legacyPackage!.credits) + Number(legacyPackage!.bonusCredits ?? 0)));
        wallet.availableCredits = Number(wallet.availableCredits) + credits;
        await manager.save(wallet);
        await manager.save(manager.create(WalletTransaction, { userId: locked.userId, amount: credits, type: 'credit', reason: 'purchase', referenceId: locked.id, metadata: { paymentId: locked.id, providerTransaction: transaction } }));
        locked.status = 'completed';
        locked.providerMetadata = { ...(locked.providerMetadata ?? {}), transaction };
        locked.providerReference = String(transaction.hash ?? locked.providerReference).toLowerCase();
        await manager.save(locked);
      });
    } catch (error) {
      // A concurrent payment may claim this hash after the lookup above.
      // The entire credit transaction has rolled back before returning 409.
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as { code?: string; constraint?: string };
        if (driverError.code === '23505' && driverError.constraint === 'IDX_payment_provider_reference_unique') {
          throw new ConflictException('This Bakong transaction has already been used for another payment. Upload a different receipt.');
        }
      }
      throw error;
    }
  }
}

export function assertUser(requestUser: { sub?: string } | undefined): string { if (!requestUser?.sub) throw new UnauthorizedException('Invalid authenticated user'); return String(requestUser.sub); }
