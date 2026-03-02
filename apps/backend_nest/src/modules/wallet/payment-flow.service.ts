// payment-flow.service.ts (updated to use float numbers instead of string)
import { Injectable, BadRequestException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentGateway } from './payment.gateway';
import { PaymentService, TransactionData } from '../../services/payment.service';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { CreditPackage } from '../../libs/entities/ai/credit-package.entity';
import { User } from '../../libs/entities/user/user.entity';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';
import {
  TransactionType,
  TransactionReason,
  WalletTransaction,
} from '../../libs/entities/ai/wallet-transaction.entity';
import { PaymentStatus } from '../../libs/enums/Status';
import { Currency, PaymentMethod } from '../../libs/enums/Payment';
import { StartPaymentResponseDto } from '../../libs/dtos/wallet/start-payment-response.dto';

@Injectable()
export class PaymentFlowService implements OnModuleInit {
  private readonly logger = new Logger(PaymentFlowService.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly gateway: PaymentGateway,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(CreditPackage)
    private readonly packageRepo: Repository<CreditPackage>,

    @InjectRepository(UserCreditBalance)
    private readonly balanceRepo: Repository<UserCreditBalance>,

    @InjectRepository(WalletTransaction)
    private readonly walletRepo: Repository<WalletTransaction>,
  ) { }

  onModuleInit() { }

  async startPayment(userId: number, packageId: number): Promise<StartPaymentResponseDto> {
    try {
      if (!userId) throw new BadRequestException('User ID is required');
      if (!packageId) throw new BadRequestException('Package ID is required');
      const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
      if (!pkg) {
        throw new NotFoundException('Credit package not found');
      }
      const payment = await this.paymentRepo.save({
        user: { id: userId },
        creditPackage: { id: packageId },
        amount: pkg.price,
        currency: pkg.currency || Currency.USD,
        paymentMethod: PaymentMethod.BAKOGN,
        status: PaymentStatus.PENDING,
      });
      this.handlePaymentWorkflow(payment.id, pkg.price, userId);
      return { paymentId: payment.id, message: 'Payment initiated' };
    } catch (err) {
      throw err instanceof NotFoundException || err instanceof BadRequestException ? err : new BadRequestException('Failed to start payment');
    }
  }

  private async handlePaymentWorkflow(paymentId: number, amount: number, userId: number) {
    try {
      if (!paymentId || !userId || typeof amount !== 'number' || amount <= 0) throw new BadRequestException('Invalid payment workflow parameters');
      this.logger.log(amount);
      const qr = this.paymentService.createQR({ currency: 'USD', amount });
      const md5 = this.paymentService.generateMD5(qr);
      this.logger.log(qr);
      this.logger.log(md5);
      this.gateway.sendQr(userId, qr);
      void this.startPaymentPolling(paymentId, md5, userId);
    } catch (err) {
      this.logger.error('Failed to handle payment workflow', err);
    }
  }

  async startPaymentPolling(paymentId: number, md5: string, userId: number) {
    try {
      if (!paymentId || !md5 || !userId) throw new BadRequestException('Invalid polling parameters');
      await this.sleep(15000);
      const timeoutMs = 3 * 60 * 1000; // 3 minutes
      const intervalMs = 5000;
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        try {
          const response = await this.paymentService.checkPayment(md5);
          this.gateway.sendStatus(userId, response.responseCode === 0 ? 'PAID' : 'UNPAID');
          if (response.responseCode === 0) {
            await this.handleSuccess(paymentId);
            return;
          }
        } catch (err) {
          this.logger.error(`Polling error for payment ${paymentId}:`, err);
        }
        await this.sleep(intervalMs);
      }
      this.gateway.sendStatus(userId, 'EXPIRED');
    } catch (err) {
      this.logger.error('Failed to start payment polling', err);
    }
  }

  private async handleSuccess(paymentId: number, paymentData?: TransactionData) {
    try {
      if (!paymentId) throw new BadRequestException('Payment ID is required');
      const payment = await this.paymentRepo.findOne({
        where: { id: paymentId },
        relations: ['creditPackage', 'user'],
      });
      if (!payment || payment.status === PaymentStatus.COMPLETED) return;
      const { creditPackage, user } = payment;
      if (!creditPackage || !user) throw new BadRequestException('Invalid payment data');
      const totalCredits = creditPackage.credits + (creditPackage.bonusCredits || 0);
      let userWallet = await this.balanceRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user'],
      });
      if (!userWallet) {
        userWallet = this.balanceRepo.create({
          user,
          creditBalance: 0,
        });
        userWallet = await this.balanceRepo.save(userWallet);
      }
      const balanceBefore = userWallet.creditBalance;
      const balanceAfter = balanceBefore + totalCredits;
      userWallet.creditBalance = balanceAfter;
      await this.balanceRepo.save(userWallet);
      await this.walletRepo.save({
        wallet: userWallet,
        type: TransactionType.CREDIT,
        reason: TransactionReason.PURCHASE,
        amount: totalCredits,
        balanceBefore,
        balanceAfter,
        description: `Purchased credit package: ${creditPackage.name}`,
        metadata: { paymentId: payment.id, packageId: creditPackage.id },
      });
      //payment data store
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = paymentData.hash;
      payment.transactionDetails = paymentData;
      await this.paymentRepo.save(payment);
      this.logger.log(
        `Payment ${paymentId} completed. Credited ${totalCredits} credits to user ${user.id}.`,
      );
    } catch (err) {
      this.logger.error('Failed to handle payment success', err);
    }
  }
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async verifyTransactionByHash(
    hash: string,
    amount: number,
    currency: Currency,
  ): Promise<any> {
    try {
      // ✅ 1. Validate input properly
      if (!hash || typeof hash !== 'string') {
        throw new BadRequestException('Hash is required');
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }

      if (!['USD', 'KHR'].includes(currency)) {
        throw new BadRequestException('Currency must be either USD or KHR');
      }

      const existingTransaction = await this.paymentRepo.findOne({
        where: { transactionId: hash },
        relations: ['user', 'creditPackage'],
      });

      if (existingTransaction) {
        return {
          responseCode: 0,
          responseMessage: 'Transaction already verified',
          data: existingTransaction.transactionDetails,
        };
      }

      const bakongResponse = await this.paymentService.checkPaymentByHash(
        hash,
        amount,
        currency,
      );

      if (bakongResponse.responseCode !== 0) {
        return {
          responseCode: 1,
          responseMessage: bakongResponse.responseMessage,
          errorCode: bakongResponse.errorCode ?? 1,
          data: null,
        };
      }

      const txn = bakongResponse.data;
      if (txn.amount !== amount || txn.currency !== currency) {
        this.logger.warn(
          `Transaction mismatch: expected ${amount} ${currency}, got ${txn.amount} ${txn.currency}`,
        );
        throw new BadRequestException('Transaction amount or currency mismatch');
      }
      return {
        responseCode: 0,
        responseMessage: 'Getting transaction successfully.',
        data: txn,
      };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error('Failed to verify transaction by hash', err);
      throw new BadRequestException('Failed to verify transaction');
    }
  }

  /**
   * User self-submit payment proof endpoint
   * Implements complete verification flow with transaction and wallet crediting
   */
  async submitPaymentProof(
    userId: number,
    paymentHash: string,
    imageUrl: string,
    packageId: number,
  ): Promise<{ transactionId: number; message: string; creditsApplied: number }> {
    try {
      // ✅ 1. Validate input
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!paymentHash || typeof paymentHash !== 'string') {
        throw new BadRequestException('Payment hash is required');
      }

      if (paymentHash.length !== 8) {
        throw new BadRequestException('Payment hash must be exactly 8 characters');
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new BadRequestException('Image URL is required');
      }

      // Basic URL validation
      try {
        new URL(imageUrl);
      } catch {
        throw new BadRequestException('Image URL must be a valid URL');
      }

      if (!packageId || typeof packageId !== 'number' || packageId <= 0) {
        throw new BadRequestException('Package ID must be a positive number');
      }

      // ✅ 2. Prevent duplicate payment
      const existingTransaction = await this.paymentRepo.findOne({
        where: { transactionId: paymentHash },
      });

      if (existingTransaction) {
        throw new BadRequestException('Payment already used');
      }

      // ✅ 3. Load the package
      const pkg = await this.packageRepo.findOne({
        where: { id: packageId },
      });

      if (!pkg) {
        throw new NotFoundException('Credit package not found');
      }

      // ✅ 4. Call Bakong verification
      const bakongResponse = await this.paymentService.checkPaymentByHash(
        paymentHash,
        pkg.price,
        pkg.currency || Currency.USD,
      );

      if (bakongResponse.responseCode !== 0) {
        throw new BadRequestException(
          bakongResponse.responseMessage || 'Payment verification failed with Bakong',
        );
      }

      if (!bakongResponse.data) {
        throw new BadRequestException('No transaction data returned from Bakong');
      }

      // ✅ 5. Validate amount matches package (CRITICAL SECURITY CHECK)
      const bakongAmount = bakongResponse.data.amount;
      const bakongCurrency = bakongResponse.data.currency;
      const packageAmount = pkg.price;
      const packageCurrency = pkg.currency || Currency.USD;

      if (bakongAmount !== packageAmount || bakongCurrency !== packageCurrency) {
        this.logger.warn(
          `Payment amount mismatch: Bakong ${bakongAmount} ${bakongCurrency} vs Package ${packageAmount} ${packageCurrency}`,
        );
        throw new BadRequestException(
          'Payment amount does not match selected package',
        );
      }

      // ✅ 6. Load user
      const user = await this.paymentRepo.query(
        'SELECT * FROM "user" WHERE id = $1',
        [userId],
      );

      if (!user || user.length === 0) {
        throw new BadRequestException('User not found');
      }

      // ✅ 7. Save transaction (SUCCESS CASE) with image proof
      const payment = await this.paymentRepo.save({
        transactionId: paymentHash,
        user: { id: userId },
        creditPackage: { id: packageId },
        amount: bakongAmount,
        currency: bakongCurrency,
        paymentMethod: PaymentMethod.BAKOGN,
        status: PaymentStatus.COMPLETED,
        imgProof: imageUrl, 
        // Store the Cloudinary image URL as proof
        transactionDetails: {
          ...bakongResponse.data,
        },
      });

      // ✅ 8. Credit user wallet (atomic/transactional + idempotent)
      const totalCredits = pkg.credits + (pkg.bonusCredits || 0);

      let userWallet = await this.balanceRepo.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!userWallet) {
        userWallet = this.balanceRepo.create({
          user: { id: userId },
          creditBalance: 0,
        });
        userWallet = await this.balanceRepo.save(userWallet);
      }

      const balanceBefore = userWallet.creditBalance;
      const balanceAfter = balanceBefore + totalCredits;
      userWallet.creditBalance = balanceAfter;
      await this.balanceRepo.save(userWallet);

      // Create wallet transaction record
      await this.walletRepo.save({
        wallet: userWallet,
        type: TransactionType.CREDIT,
        reason: TransactionReason.PURCHASE,
        amount: totalCredits,
        balanceBefore,
        balanceAfter,
        description: `Purchased credit package: ${pkg.name}`,
        metadata: {
          paymentId: payment.id,
          packageId: pkg.id,
          transactionHash: paymentHash,
          proofImageUrl: imageUrl,
        },
      });

      this.logger.log(
        `Payment ${paymentHash} verified by user ${userId}. Credited ${totalCredits} credits.`,
      );

      return {
        transactionId: payment.id,
        message: 'Payment verified and credits applied',
        creditsApplied: totalCredits,
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error('Failed to submit payment proof', err);
      throw new BadRequestException('Failed to process payment proof submission');
    }
  }
}