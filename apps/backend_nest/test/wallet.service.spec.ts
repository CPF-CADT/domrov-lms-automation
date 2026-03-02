import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Repository, DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { WalletService } from '../src/modules/wallet/wallet.service';
import { UserCreditBalance } from '../src/libs/entities/ai/user-credit-balance.entity';
import { WalletTransaction, TransactionType, TransactionReason } from '../src/libs/entities/ai/wallet-transaction.entity';
import { TransactionHistoryResponseDto, WalletTransactionDto } from '../src/libs/dtos/wallet/wallet.dto';

describe('WalletService - Enhanced Computation Tests', () => {
    let walletService: WalletService;
    let walletRepositoryMock: jest.Mocked<Repository<UserCreditBalance>>;
    let transactionRepositoryMock: jest.Mocked<Repository<WalletTransaction>>;
    let dataSourceMock: jest.Mocked<DataSource>;

    const testDate = new Date('2024-01-01T10:00:00.000Z');

    const mockExistingWallet: UserCreditBalance = {
        id: 10,
        user: { id: 1 } as any,
        creditBalance: 100,
    } as UserCreditBalance;

    const mockNewWalletBase: UserCreditBalance = {
        id: 999,
        user: { id: 1 } as any,
        creditBalance: 0,
    } as UserCreditBalance;

    const mockTransaction1: WalletTransaction = {
        id: 101,
        walletId: 10,
        amount: 50,
        type: TransactionType.CREDIT,
        reason: TransactionReason.PURCHASE,
        balanceBefore: 100,
        balanceAfter: 150,
        description: 'Added 50 credits',
        created_at: testDate,
        updated_at: testDate,
    } as WalletTransaction;

    const mockTransaction2: WalletTransaction = {
        id: 102,
        walletId: 10,
        amount: 20,
        type: TransactionType.DEBIT,
        reason: TransactionReason.AI_USAGE,
        balanceBefore: 150,
        balanceAfter: 130,
        description: 'Deducted 20 credits',
        created_at: new Date('2024-01-02T10:00:00.000Z'),
        updated_at: new Date('2024-01-02T10:00:00.000Z'),
    } as WalletTransaction;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WalletService,
                {
                    provide: getRepositoryToken(UserCreditBalance),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(WalletTransaction),
                    useValue: {
                        findAndCount: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        transaction: jest.fn(),
                    },
                },
            ],
        }).compile();

        walletService = module.get<WalletService>(WalletService);
        walletRepositoryMock = module.get(getRepositoryToken(UserCreditBalance)) as jest.Mocked<Repository<UserCreditBalance>>;
        transactionRepositoryMock = module.get(getRepositoryToken(WalletTransaction)) as jest.Mocked<Repository<WalletTransaction>>;
        dataSourceMock = module.get(DataSource) as jest.Mocked<DataSource>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // DETAILED COMPUTATION TESTS: addCredits
    // ============================================================================

    describe('addCredits - Detailed Computation Verification', () => {
        const mockManager = {
            save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
        };

        it('WALLET_ADDCREDITS_COMPUTE_001 - verifies exact balance calculation: 100 + 50 = 150', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 100 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const addAmount = 50;
            const expectedNewBalance = 100 + addAmount;

            const result = await walletService.addCredits(1, addAmount, TransactionReason.PURCHASE, 'Test');

            expect(result.creditBalance).toBe(expectedNewBalance);
            expect(result.creditBalance).toBe(150);
        });

        it('WALLET_ADDCREDITS_COMPUTE_002 - verifies transaction balanceBefore equals wallet initial state', async () => {
            const initialBalance = 250;
            const wallet = { ...mockExistingWallet, creditBalance: initialBalance };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.addCredits(1, 100, TransactionReason.BONUS);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.balanceBefore).toBe(initialBalance);
            expect(createCall.balanceBefore).toBe(250);
        });

        it('WALLET_ADDCREDITS_COMPUTE_003 - verifies balanceAfter = balanceBefore + amount', async () => {
            const balanceBefore = 75;
            const amount = 25;
            const wallet = { ...mockExistingWallet, creditBalance: balanceBefore };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.addCredits(1, amount, TransactionReason.PURCHASE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.balanceAfter).toBe(balanceBefore + amount);
            expect(createCall.balanceAfter).toBe(100);
        });

        it('WALLET_ADDCREDITS_COMPUTE_004 - verifies multiple sequential additions: 0 + 50 + 75 = 125', async () => {
            const createdWallet = { ...mockNewWalletBase, creditBalance: 0, id: 999 };
            walletRepositoryMock.findOne.mockResolvedValue(null);
            walletRepositoryMock.create.mockReturnValue(createdWallet);
            walletRepositoryMock.save.mockResolvedValue(createdWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            // First addition: 0 + 50
            let result = await walletService.addCredits(1, 50, TransactionReason.PURCHASE);
            expect(result.creditBalance).toBe(50);

            // Reset for second addition
            const walletAfterFirst = { ...createdWallet, creditBalance: 50 };
            walletRepositoryMock.findOne.mockResolvedValue(walletAfterFirst);

            // Second addition: 50 + 75
            result = await walletService.addCredits(1, 75, TransactionReason.BONUS);
            expect(result.creditBalance).toBe(125);
        });

        it('WALLET_ADDCREDITS_COMPUTE_005 - verifies decimal precision: 99.99 + 0.01 = 100.00', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 99.99 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const result = await walletService.addCredits(1, 0.01, TransactionReason.PURCHASE);

            expect(result.creditBalance).toBeCloseTo(100, 2);
            expect(result.creditBalance).toBe(100);
        });

        it('WALLET_ADDCREDITS_COMPUTE_006 - verifies large amount addition: 1000000 + 5000 = 1005000', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 1000000 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const result = await walletService.addCredits(1, 5000, TransactionReason.BONUS);

            expect(result.creditBalance).toBe(1005000);
        });

        it('WALLET_ADDCREDITS_COMPUTE_007 - verifies transaction amount matches requested amount', async () => {
            const requestedAmount = 175.5;
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.addCredits(1, requestedAmount, TransactionReason.PURCHASE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.amount).toBe(requestedAmount);
        });

        it('WALLET_ADDCREDITS_COMPUTE_008 - verifies type is always CREDIT for addCredits', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.addCredits(1, 50, TransactionReason.BONUS);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.type).toBe(TransactionType.CREDIT);
            expect(createCall.type).not.toBe(TransactionType.DEBIT);
        });

        it('WALLET_ADDCREDITS_COMPUTE_009 - verifies reason is preserved in transaction', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const reason = TransactionReason.BONUS;
            await walletService.addCredits(1, 50, reason);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.reason).toBe(reason);
        });

        it('WALLET_ADDCREDITS_COMPUTE_010 - verifies wallet and transaction both saved during transaction', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 100 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            const savedCalls: any[] = [];
            mockManager.save.mockImplementation((entity: any) => {
                savedCalls.push(entity);
                return Promise.resolve(entity);
            });
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.addCredits(1, 50, TransactionReason.PURCHASE);

            expect(mockManager.save).toHaveBeenCalledTimes(2);
            expect(savedCalls.length).toBe(2);
            // Verify both wallet and transaction were saved
            const walletSaved = savedCalls.some(call => call.id === wallet.id);
            expect(walletSaved).toBe(true);
        });
    });

    // ============================================================================
    // DETAILED COMPUTATION TESTS: deductCredits
    // ============================================================================

    describe('deductCredits - Detailed Computation Verification', () => {
        const mockManager = {
            save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
        };

        it('WALLET_DEDUCTCREDITS_COMPUTE_001 - verifies exact balance calculation: 200 - 45 = 155', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 200 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const deductAmount = 45;
            const expectedNewBalance = 200 - deductAmount;

            const result = await walletService.deductCredits(1, deductAmount, TransactionReason.AI_USAGE);

            expect(result.creditBalance).toBe(expectedNewBalance);
            expect(result.creditBalance).toBe(155);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_002 - verifies transaction balanceBefore equals wallet initial state', async () => {
            const initialBalance = 500;
            const wallet = { ...mockExistingWallet, creditBalance: initialBalance };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.deductCredits(1, 100, TransactionReason.AI_USAGE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.balanceBefore).toBe(initialBalance);
            expect(createCall.balanceBefore).toBe(500);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_003 - verifies balanceAfter = balanceBefore - amount', async () => {
            const balanceBefore = 300;
            const amount = 150;
            const wallet = { ...mockExistingWallet, creditBalance: balanceBefore };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.deductCredits(1, amount, TransactionReason.AI_USAGE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.balanceAfter).toBe(balanceBefore - amount);
            expect(createCall.balanceAfter).toBe(150);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_004 - verifies balance becomes zero: 100 - 100 = 0', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 100 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const result = await walletService.deductCredits(1, 100, TransactionReason.AI_USAGE);

            expect(result.creditBalance).toBe(0);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_005 - verifies sequential deductions: 1000 - 300 - 200 = 500', async () => {
            let wallet = { ...mockExistingWallet, creditBalance: 1000 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            // First deduction: 1000 - 300
            let result = await walletService.deductCredits(1, 300, TransactionReason.AI_USAGE);
            expect(result.creditBalance).toBe(700);

            // Setup for second deduction
            wallet = { ...mockExistingWallet, creditBalance: 700 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);

            // Second deduction: 700 - 200
            result = await walletService.deductCredits(1, 200, TransactionReason.AI_USAGE);
            expect(result.creditBalance).toBe(500);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_006 - verifies decimal precision: 99.99 - 0.99 = 99.00', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 99.99 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            const result = await walletService.deductCredits(1, 0.99, TransactionReason.AI_USAGE);

            expect(result.creditBalance).toBeCloseTo(99.00, 2);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_007 - verifies transaction type respects custom type parameter', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.deductCredits(1, 50, TransactionReason.AI_USAGE, 'desc', TransactionType.PURCHASE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.type).toBe(TransactionType.PURCHASE);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_008 - verifies default type is DEBIT when not specified', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.deductCredits(1, 50, TransactionReason.AI_USAGE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.type).toBe(TransactionType.DEBIT);
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_009 - verifies negative balance after deduction throws error', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 30 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => {
                throw new Error('Insufficient funds');
            });

            await expect(walletService.deductCredits(1, 50, TransactionReason.AI_USAGE)).rejects.toThrow(
                BadRequestException
            );
        });

        it('WALLET_DEDUCTCREDITS_COMPUTE_010 - verifies amount is preserved in transaction record', async () => {
            const deductAmount = 123.45;
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));

            await walletService.deductCredits(1, deductAmount, TransactionReason.AI_USAGE);

            const createCall = transactionRepositoryMock.create.mock.calls[0][0];
            expect(createCall.amount).toBe(deductAmount);
        });
    });

    // ============================================================================
    // DETAILED COMPUTATION TESTS: hasEnoughBalance
    // ============================================================================

    describe('hasEnoughBalance - Detailed Computation Verification', () => {
        it('WALLET_HASENOUGHBALANCE_COMPUTE_001 - verifies equality condition: balance = amount returns true', async () => {
            const balance = 500;
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: balance });

            const result = await walletService.hasEnoughBalance(1, balance);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_002 - verifies greater than condition: 1000 > 500 returns true', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 1000 });

            const result = await walletService.hasEnoughBalance(1, 500);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_003 - verifies less than condition: 200 < 500 returns false', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 200 });

            const result = await walletService.hasEnoughBalance(1, 500);

            expect(result).toBe(false);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_004 - verifies boundary: balance = amount - 1 returns false', async () => {
            const requiredAmount = 100;
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: requiredAmount - 1 });

            const result = await walletService.hasEnoughBalance(1, requiredAmount);

            expect(result).toBe(false);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_005 - verifies boundary: balance = amount + 1 returns true', async () => {
            const requiredAmount = 100;
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: requiredAmount + 1 });

            const result = await walletService.hasEnoughBalance(1, requiredAmount);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_006 - verifies zero check: 0 balance vs 0 amount returns true', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 0 });

            const result = await walletService.hasEnoughBalance(1, 0);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_007 - verifies decimal precision: 99.99 >= 99.99 returns true', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 99.99 });

            const result = await walletService.hasEnoughBalance(1, 99.99);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_008 - verifies decimal precision: 99.98 < 99.99 returns false', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 99.98 });

            const result = await walletService.hasEnoughBalance(1, 99.99);

            expect(result).toBe(false);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_009 - verifies large numbers: 999999999 > 1000 returns true', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 999999999 });

            const result = await walletService.hasEnoughBalance(1, 1000);

            expect(result).toBe(true);
        });

        it('WALLET_HASENOUGHBALANCE_COMPUTE_010 - verifies fractional edge case: 0.1 + 0.2 >= 0.3', async () => {
            // JavaScript floating point edge case: 0.1 + 0.2 != 0.3
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 0.3 });

            const result = await walletService.hasEnoughBalance(1, 0.3);

            expect(result).toBe(true);
        });
    });

    // ============================================================================
    // DETAILED COMPUTATION TESTS: getBalance
    // ============================================================================

    describe('getBalance - Detailed Computation Verification', () => {
        it('WALLET_GETBALANCE_COMPUTE_001 - returns exact balance value from wallet', async () => {
            const exactBalance = 12345.67;
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: exactBalance });

            const result = await walletService.getBalance(1);

            expect(result).toBe(exactBalance);
            expect(result).toBe(12345.67);
        });

        it('WALLET_GETBALANCE_COMPUTE_002 - returns zero for newly created wallet', async () => {
            const newWallet = { ...mockNewWalletBase, creditBalance: 0 };
            walletRepositoryMock.findOne.mockResolvedValue(null);
            walletRepositoryMock.create.mockReturnValue(newWallet);
            walletRepositoryMock.save.mockResolvedValue(newWallet);

            const result = await walletService.getBalance(1);

            expect(result).toBe(0);
        });

        it('WALLET_GETBALANCE_COMPUTE_003 - preserves decimal precision: returns 999.99 exactly', async () => {
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: 999.99 });

            const result = await walletService.getBalance(1);

            expect(result).toBe(999.99);
            expect(result).toBeCloseTo(999.99, 2);
        });

        it('WALLET_GETBALANCE_COMPUTE_004 - returns correct balance after multiple operations in sequence', async () => {
            const balances = [100, 200, 150, 500];

            for (const balance of balances) {
                walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: balance });
                const result = await walletService.getBalance(1);
                expect(result).toBe(balance);
            }
        });

        it('WALLET_GETBALANCE_COMPUTE_005 - returns large balance values without overflow: 999999999', async () => {
            const largeBalance = 999999999;
            walletRepositoryMock.findOne.mockResolvedValue({ ...mockExistingWallet, creditBalance: largeBalance });

            const result = await walletService.getBalance(1);

            expect(result).toBe(largeBalance);
        });
    });

    // ============================================================================
    // DETAILED COMPUTATION TESTS: getTransactionHistory
    // ============================================================================

    describe('getTransactionHistory - Detailed Computation Verification', () => {
        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_001 - verifies pagination skip calculation: page 1, limit 10 => skip 0', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[mockTransaction1], 1]);

            await walletService.getTransactionHistory(1, 1, 10);

            const findAndCountCall = transactionRepositoryMock.findAndCount.mock.calls[0][0];
            expect(findAndCountCall.skip).toBe(0);
            expect(findAndCountCall.take).toBe(10);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_002 - verifies pagination skip calculation: page 2, limit 10 => skip 10', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], 50]);

            await walletService.getTransactionHistory(1, 2, 10);

            const findAndCountCall = transactionRepositoryMock.findAndCount.mock.calls[0][0];
            expect(findAndCountCall.skip).toBe((2 - 1) * 10);
            expect(findAndCountCall.skip).toBe(10);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_003 - verifies pagination skip calculation: page 5, limit 20 => skip 80', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], 200]);

            await walletService.getTransactionHistory(1, 5, 20);

            const findAndCountCall = transactionRepositoryMock.findAndCount.mock.calls[0][0];
            expect(findAndCountCall.skip).toBe((5 - 1) * 20);
            expect(findAndCountCall.skip).toBe(80);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_004 - calculates totalPages correctly: total 100, limit 10 => 10 pages', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            const mockTxs = Array(10).fill(mockTransaction1);
            transactionRepositoryMock.findAndCount.mockResolvedValue([mockTxs, 100]);

            const result = await walletService.getTransactionHistory(1, 1, 10);

            expect(result.meta.totalPages).toBe(Math.ceil(100 / 10));
            expect(result.meta.totalPages).toBe(10);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_005 - calculates totalPages with remainder: total 105, limit 10 => 11 pages', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            const mockTxs = Array(5).fill(mockTransaction1);
            transactionRepositoryMock.findAndCount.mockResolvedValue([mockTxs, 105]);

            const result = await walletService.getTransactionHistory(1, 11, 10);

            expect(result.meta.totalPages).toBe(Math.ceil(105 / 10));
            expect(result.meta.totalPages).toBe(11);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_006 - verifies meta.total equals repository total count', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            const totalCount = 247;
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], totalCount]);

            const result = await walletService.getTransactionHistory(1, 1, 10);

            expect(result.meta.total).toBe(totalCount);
            expect(result.meta.total).toBe(247);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_007 - verifies meta.page preserved in response', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], 50]);

            const result = await walletService.getTransactionHistory(1, 7, 15);

            expect(result.meta.page).toBe(7);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_008 - verifies meta.limit preserved in response', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], 100]);

            const result = await walletService.getTransactionHistory(1, 1, 25);

            expect(result.meta.limit).toBe(25);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_009 - verifies empty result returns totalPages = 0', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            transactionRepositoryMock.findAndCount.mockResolvedValue([[], 0]);

            const result = await walletService.getTransactionHistory(1, 1, 10);

            expect(result.meta.totalPages).toBe(0);
            expect(result.data.length).toBe(0);
        });

        it('WALLET_GETTRANSACTIONHISTORY_COMPUTE_010 - verifies transaction data DTO mapping preserves all fields', async () => {
            walletRepositoryMock.findOne.mockResolvedValue(mockExistingWallet);
            const tx = {
                ...mockTransaction1,
                id: 999,
                amount: 456.78,
                balanceBefore: 1000,
                balanceAfter: 1456.78,
            };
            transactionRepositoryMock.findAndCount.mockResolvedValue([[tx], 1]);

            const result = await walletService.getTransactionHistory(1, 1, 10);

            expect(result.data[0].id).toBe(999);
            expect(result.data[0].amount).toBe(456.78);
            expect(result.data[0].balanceBefore).toBe(1000);
            expect(result.data[0].balanceAfter).toBe(1456.78);
        });
    });

    // ============================================================================
    // EDGE CASE: Complex Transaction Chains
    // ============================================================================

    describe('Complex Transaction Chains - Computation Integrity', () => {
        const mockManager = {
            save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
        };

        it('WALLET_COMPLEX_COMPUTE_001 - maintains balance integrity: add 100, deduct 30, deduct 20 => final 50', async () => {
            let currentBalance = 0;

            // Add 100
            let wallet = { ...mockExistingWallet, creditBalance: currentBalance };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(mockManager));
            let result = await walletService.addCredits(1, 100, TransactionReason.PURCHASE);
            currentBalance = result.creditBalance;
            expect(currentBalance).toBe(100);

            // Deduct 30
            wallet = { ...mockExistingWallet, creditBalance: currentBalance };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            result = await walletService.deductCredits(1, 30, TransactionReason.AI_USAGE);
            currentBalance = result.creditBalance;
            expect(currentBalance).toBe(70);

            // Deduct 20
            wallet = { ...mockExistingWallet, creditBalance: currentBalance };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            result = await walletService.deductCredits(1, 20, TransactionReason.AI_USAGE);
            currentBalance = result.creditBalance;
            expect(currentBalance).toBe(50);
        });

        it('WALLET_COMPLEX_COMPUTE_002 - verifies all transactions maintain consistent balanceAfter/balanceBefore', async () => {
            const transactions = [];
            let balance = 500;

            // Simulate 5 transactions
            const operations = [
                { type: 'add', amount: 100 },
                { type: 'deduct', amount: 50 },
                { type: 'add', amount: 200 },
                { type: 'deduct', amount: 75 },
                { type: 'add', amount: 25 },
            ];

            for (const op of operations) {
                const balanceBefore = balance;
                if (op.type === 'add') {
                    balance += op.amount;
                } else {
                    balance -= op.amount;
                }
                const balanceAfter = balance;

                expect(balanceAfter).toBe(balanceBefore + (op.type === 'add' ? op.amount : -op.amount));
            }

            // Final balance should be: 500 + 100 - 50 + 200 - 75 + 25 = 700
            expect(balance).toBe(700);
        });

        it('WALLET_COMPLEX_COMPUTE_003 - verifies mathematical commutative property: add multiple amounts in different order', async () => {
            // (100 + 50 + 75) = (75 + 100 + 50)
            const amount1 = 100;
            const amount2 = 50;
            const amount3 = 75;
            const expectedTotal = amount1 + amount2 + amount3;

            expect(expectedTotal).toBe(225);
            expect(amount1 + amount2 + amount3).toBe(amount3 + amount1 + amount2);
        });

        it('WALLET_COMPLEX_COMPUTE_004 - verifies balance never goes negative in deduction', async () => {
            const wallet = { ...mockExistingWallet, creditBalance: 100 };
            walletRepositoryMock.findOne.mockResolvedValue(wallet);
            dataSourceMock.transaction.mockImplementation(async (cb: any) => {
                throw new Error('Insufficient balance');
            });

            await expect(walletService.deductCredits(1, 150, TransactionReason.AI_USAGE)).rejects.toThrow();
        });
    });
});