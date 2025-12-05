import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserTokenBalance } from '../../../libs/entities/user-token-balance.entity';
import { TransactionType, WalletTransaction } from '../../../libs/entities/wallet-transaction.entity';

// Entities

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(UserTokenBalance) private balanceRepo: Repository<UserTokenBalance>,
        @InjectRepository(WalletTransaction) private txRepo: Repository<WalletTransaction>,
        private dataSource: DataSource, // Used for database transactions (safety)
    ) { }

    /**
     * Get User Balance (Auto-creates wallet if missing)
     */
    async getBalance(userId: number): Promise<UserTokenBalance> {
        let wallet = await this.balanceRepo.findOne({
            where: { user: { id: userId } }
        });

        if (!wallet) {
            wallet = this.balanceRepo.create({
                user: { id: userId },
                tokenBalance: 0
            });
            await this.balanceRepo.save(wallet);
        }
        return wallet;
    }

    /**
     * Get Transaction History
     */
    async getTransactionHistory(userId: number) {
        return this.txRepo.find({
            where: { wallet: { user: { id: userId } } },
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * DEDUCT TOKENS (Use this when User uses AI)
     * Uses Pessimistic Locking to prevent double-spending.
     */
    async deductTokens(userId: number, amount: number, description: string): Promise<boolean> {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Lock the wallet row
            const wallet = await manager.findOne(UserTokenBalance, {
                where: { user: { id: userId } },
                lock: { mode: 'pessimistic_write' },
            });

            if (!wallet || wallet.tokenBalance < amount) {
                throw new BadRequestException('Insufficient token balance');
            }

            // 2. Update Balance
            wallet.tokenBalance -= amount;
            await manager.save(wallet);

            // 3. Log Transaction
            const tx = manager.create(WalletTransaction, {
                wallet,
                amount: -amount,
                balanceAfter: wallet.tokenBalance,
                type: TransactionType.SPEND,
                description,
            });
            await manager.save(tx);

            return true;
        });
    }

    /**
     * ADD TOKENS (Use this in your custom Payment/Buy Controller)
     */
    async addTokens(userId: number, amount: number, type: TransactionType, description: string) {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Get Wallet
            let wallet = await manager.findOne(UserTokenBalance, {
                where: { user: { id: userId } }
            });

            if (!wallet) {
                wallet = manager.create(UserTokenBalance, { user: { id: userId }, tokenBalance: 0 });
                await manager.save(wallet);
            }

            // 2. Add Balance
            wallet.tokenBalance += amount;
            await manager.save(wallet);

            // 3. Log Transaction
            const tx = manager.create(WalletTransaction, {
                wallet,
                amount: amount,
                balanceAfter: wallet.tokenBalance,
                type: type,
                description,
            });
            await manager.save(tx);

            return wallet;
        });
    }
}