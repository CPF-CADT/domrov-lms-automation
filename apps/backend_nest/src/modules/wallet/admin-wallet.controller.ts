import { Body, Controller, Get, Post, Patch, Param, ParseIntPipe, HttpCode, HttpStatus, BadRequestException, UseGuards, Query, NotFoundException } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNotFoundResponse,
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreditPackageService } from './credit-package.service';
import { CreateCreditPackageDto, UpdateCreditPackageDto } from '../../libs/dtos/wallet/wallet.dto';
import { AdminAdjustWalletDTO } from '../../libs/dtos/wallet/admin-adjust-wallet.dto';
import { CreditPackageResponseDto } from '../../libs/dtos/wallet/credit-package-response.dto';
import { AdminAdjustWalletResponseDto, AdminDeductResponseDto } from '../../libs/dtos/wallet/admin-adjust-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/security/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemRole } from '../../libs/enums/Role';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { PaymentStatus } from '../../libs/enums/Status';
import { WalletTransaction, TransactionReason } from '../../libs/entities/ai/wallet-transaction.entity';
import { User } from '../../libs/entities/user/user.entity';
import { AuthGuard } from '@nestjs/passport';
import {
    TransactionListResponseDto,
    TransactionDetailDto,
    TransactionResponseDto,
} from '../../libs/dtos/admin/transaction-admin.dto';

@ApiTags('Wallet (Admin)')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(SystemRole.SuperAdmin)
@Controller('admin/wallet')
export class AdminWalletController {
    private readonly logger = new Logger(AdminWalletController.name);

    constructor(
        private readonly packageService: CreditPackageService,
        private readonly walletService: WalletService,
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
        @InjectRepository(WalletTransaction)
        private readonly walletTransactionRepo: Repository<WalletTransaction>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    // ==================== CREATE PACKAGE ====================
    @Post('packages')
    @ApiOperation({
        summary: 'Create new credit package',
        description: 'Creates a new credit package that users can purchase. Admin only.'
    })
    @ApiBody({
        type: CreateCreditPackageDto,
        description: 'Credit package details',
        examples: {
            example1: {
                summary: 'Standard package',
                value: {
                    name: 'Premium Pack',
                    description: 'Best value for power users',
                    credits: 500,
                    price: 39.99,
                    currency: 'USD',
                    bonusCredits: 50,
                    sortOrder: 2,
                    isActive: true
                }
            }
        }
    })
    @ApiCreatedResponse({
        schema: {
            example: {
                success: true,
                data: {
                    id: 1,
                    name: 'Premium Pack',
                    description: 'Best value for power users',
                    credits: 500,
                    bonusCredits: 50,
                    price: 39.99,
                    currency: 'USD',
                    discountInPercent: 0,
                    isActive: true,
                    sortOrder: 2,
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z'
                }
            }
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
        example: {
            statusCode: 400,
            message: 'Validation failed',
            error: 'Bad Request'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Admin not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async createPackage(@Body() dto: CreateCreditPackageDto): Promise<{ success: true; data: CreditPackageResponseDto }> {
        const data = await this.packageService.create(dto);
        return { success: true, data };
    }

    // ==================== GET ALL PACKAGES ====================
    @Get('packages')
    @ApiOperation({
        summary: 'View all packages (active & inactive)',
        description: 'Retrieves all credit packages including inactive ones. Admin only.'
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: [
                    {
                        id: 1,
                        name: 'Starter Pack',
                        description: 'Perfect for beginners',
                        credits: 100,
                        bonusCredits: 10,
                        price: 9.99,
                        currency: 'USD',
                        discountInPercent: 0,
                        isActive: true,
                        sortOrder: 1,
                        created_at: '2024-01-15T10:30:00Z',
                        updated_at: '2024-01-15T10:30:00Z'
                    },
                    {
                        id: 2,
                        name: 'Inactive Pack',
                        description: 'Discontinued package',
                        credits: 200,
                        bonusCredits: 0,
                        price: 19.99,
                        currency: 'USD',
                        discountInPercent: 0,
                        isActive: false,
                        sortOrder: 99,
                        created_at: '2024-01-10T10:30:00Z',
                        updated_at: '2024-01-12T10:30:00Z'
                    }
                ]
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Admin not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async getAllPackages(): Promise<{ success: true; data: CreditPackageResponseDto[] }> {
        const data = await this.packageService.findAll();
        return { success: true, data };
    }

    // ==================== TOGGLE PACKAGE STATUS ====================
    @Patch('packages/:id/toggle')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Activate/Deactivate package',
        description: 'Toggles the active status of a credit package. Inactive packages are hidden from users.'
    })
    @ApiParam({ name: 'id', type: Number, description: 'Credit package ID', example: 1 })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    id: 1,
                    name: 'Premium Pack',
                    description: 'Best value for power users',
                    credits: 500,
                    bonusCredits: 50,
                    price: 39.99,
                    currency: 'USD',
                    discountInPercent: 0,
                    isActive: false,
                    sortOrder: 2,
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-16T10:30:00Z'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'Credit package not found',
        example: {
            statusCode: 404,
            message: 'Credit package with ID 999 not found',
            error: 'Not Found'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Admin not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async togglePackage(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: CreditPackageResponseDto }> {
        const data = await this.packageService.toggleActive(id);
        return { success: true, data };
    }

    // ==================== MANUAL WALLET ADJUSTMENT ====================
    @Post('adjust')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Manually add/remove credits from user wallet',
        description: 'Allows admin to manually adjust user wallet balance for refunds, bonuses, or corrections. Use positive amount to add credits, negative to deduct.'
    })
    @ApiBody({
        type: AdminAdjustWalletDTO,
        description: 'Wallet adjustment details',
        examples: {
            addCredits: {
                summary: 'Add bonus credits',
                value: {
                    userId: 1,
                    amount: 50,
                    type: 'CREDIT',
                    reason: 'BONUS',
                    description: 'Bonus credits for early adopter'
                }
            },
            deductCredits: {
                summary: 'Deduct credits (refund reversal)',
                value: {
                    userId: 1,
                    amount: -25,
                    type: 'DEBIT',
                    reason: 'ADMIN_ADJUSTMENT',
                    description: 'Refund reversal due to chargeback'
                }
            }
        }
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    id: 1,
                    creditBalance: 150.50,
                    updated_at: '2024-01-15T10:30:00Z'
                }
            }
        }
    })
    @ApiBadRequestResponse({
        description: 'Insufficient balance for deduction',
        example: {
            statusCode: 400,
            message: 'Insufficient credit balance',
            error: 'Bad Request'
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Admin not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async manualAdjustment(@Body() dto: AdminAdjustWalletDTO): Promise<{ success: true; data: AdminAdjustWalletResponseDto | AdminDeductResponseDto }> {
        let data: AdminAdjustWalletResponseDto | AdminDeductResponseDto;

        if (dto.amount >= 0) {
            const result = await this.walletService.addCredits(
                dto.userId,
                dto.amount,
                dto.reason,
                dto.description,
            );
            data = {
                id: result.wallet.id,
                creditBalance: result.wallet.creditBalance,
                updated_at: result.wallet.updated_at
            };
        } else {
            const result = await this.walletService.deductCredits(
                dto.userId,
                Math.abs(dto.amount),
                dto.reason,
                dto.description,
            );
            data = { success: true };
        }

        return { success: true, data };
    }

    // ==================== GET ALL TRANSACTIONS (READ-ONLY) ====================
    @Get('transactions')
    @ApiOperation({
        summary: 'Get All Transactions (Paginated & Searchable)',
        description: 'Retrieve paginated list of all transactions (payments & admin adjustments) with optional filtering. Admin view only.',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ['paid', 'unpaid', 'all'] })
    @ApiQuery({ name: 'transactionType', required: false, enum: ['payment', 'admin_adjustment', 'all'], description: 'Filter by transaction type' })
    @ApiQuery({ name: 'search', required: false, type: String })
   @ApiOkResponse({
  schema: {
    example: {
      success: true,
      data: [
        {
          id: 1,
          user: "Sophea Heng",
          userId: 1,
          amount: 100,
          date: "2026-03-02T09:24:01.562Z",
          transactionType: "admin_adjustment",
          adjustmentType: "credit",
          reason: "bonus",
          balanceBefore: 1194,
          balanceAfter: 1294,
          description: "Monthly promotion bonus",
          metadata: {
            source: "admin_users_controller",
            adminAction: "add_credits",
            inputReason: "bonus"
          }
        },
        {
          id: 14,
          user: "Chanda Ngin",
          userId: 14,
          amount: 6.32,
          currency: "USD",
          method: "PAYPAL",
          status: "paid",
          date: "2026-03-02T09:23:54.142Z",
          transactionType: "payment",
          userNote: null,
          proofImageUrl: null,
          verificationNote: null,
          creditPackage: {
            id: 1,
            name: "Pack 1",
            credits: 2533,
            bonusCredits: 249
          }
        }
      ],
      total: 2,
      page: 1,
      limit: 10
    }
  }
})
    async getAllTransactions(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status: string = 'all',
        @Query('transactionType') transactionType: string = 'all',
        @Query('search') search: string = '',
    ): Promise<{ success: true; data: TransactionListResponseDto }> {
        const pageNum = page ? parseInt(String(page), 10) : 1;
        const limitNum = limit ? parseInt(String(limit), 10) : 10;
        const validPage = Math.max(1, pageNum);
        const validLimit = Math.min(100, Math.max(1, limitNum));
        const offset = (validPage - 1) * validLimit;

        try {
            let allTransactions: TransactionResponseDto[] = [];
            let totalCount = 0;

            // Fetch payments if requested
            if (transactionType === 'all' || transactionType === 'payment') {
                const paymentResults = await this.getPaymentTransactions(0, 1000, status, search);
                allTransactions.push(...paymentResults.transactions);
                totalCount += paymentResults.total;
            }

            // Fetch admin adjustments if requested
            if (transactionType === 'all' || transactionType === 'admin_adjustment') {
                const walletResults = await this.getAdminAdjustments(0, 1000, search);
                allTransactions.push(...walletResults.transactions);
                totalCount += walletResults.total;
            }

            // Sort by date (newest first)
            allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Apply pagination to combined and sorted results
            const paginatedTransactions = allTransactions.slice(offset, offset + validLimit);

            const responseData: TransactionListResponseDto = {
                data: paginatedTransactions,
                total: totalCount,
                page: validPage,
                limit: validLimit,
            };

            return { success: true, data: responseData };
        } catch (err) {
            this.logger.error('Failed to fetch transactions', err);
            throw err;
        }
    }

    private async getPaymentTransactions(
        offset: number,
        limit: number,
        status: string,
        search: string,
    ): Promise<{ transactions: TransactionResponseDto[]; total: number }> {
        // Build query builder for better filtering
        let query = this.paymentRepo.createQueryBuilder('payment')
            .leftJoinAndSelect('payment.user', 'user')
            .leftJoinAndSelect('payment.creditPackage', 'creditPackage');

        if (status !== 'all') {
            query = query.where('payment.status = :status', { status: status === 'paid' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING });
        }

        if (search) {
            // Search by user firstName, lastName, or transactionId
            query = query.andWhere(
                '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR payment.transactionId ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [payments, total] = await query
            .orderBy('payment.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const transactionData: TransactionResponseDto[] = payments.map((payment) => ({
            id: payment.id,
            user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
            userId: payment.user?.id || null,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.paymentMethod,
            status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
            date: payment.created_at.toISOString(),
            transactionType: 'payment' as const,
            userNote: null,
            proofImageUrl: payment.imgProof || null,
            verificationNote: null,
            creditPackage: payment.creditPackage
                ? {
                    id: payment.creditPackage.id,
                    name: payment.creditPackage.name,
                    credits: payment.creditPackage.credits,
                    bonusCredits: payment.creditPackage.bonusCredits,
                }
                : undefined,
        }));

        return { transactions: transactionData, total };
    }

    private async getAdminAdjustments(
        offset: number,
        limit: number,
        search: string,
    ): Promise<{ transactions: TransactionResponseDto[]; total: number }> {
        // Build query builder for better filtering
        // Include all transactions that have metadata indicating admin action (bonus, refund, adjustments)
        let query = this.walletTransactionRepo.createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.wallet', 'wallet')
            .leftJoinAndSelect('wallet.user', 'user')
            .where(`transaction.metadata IS NOT NULL AND transaction.metadata->>'adminAction' IS NOT NULL`);

        if (search) {
            // Search by user firstName, lastName, or description
            query = query.andWhere(
                '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR transaction.description ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [adminAdjustments, total] = await query
            .orderBy('transaction.created_at', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const transactionData: TransactionResponseDto[] = adminAdjustments.map((wal) => {
            const user = wal.wallet?.user;
            return {
                id: wal.id,
                user: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown',
                userId: user?.id || null,
                amount: wal.amount,
                date: wal.created_at.toISOString(),
                transactionType: 'admin_adjustment' as const,
                adjustmentType: wal.type as 'credit' | 'debit' | 'purchase',
                reason: wal.reason,
                balanceBefore: wal.balanceBefore,
                balanceAfter: wal.balanceAfter,
                description: wal.description,
                metadata: wal.metadata,
            };
        });

        return { transactions: transactionData, total };
    }

    // ==================== GET TRANSACTION DETAILS (READ-ONLY) ====================
    @Get('transactions/:transactionId')
    @ApiOperation({
        summary: 'Get Transaction Details',
        description: 'Retrieve detailed information about a specific transaction (payment or admin adjustment). Admin view only.',
    })
    @ApiParam({ name: 'transactionId', type: String })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    id: 123,
                    user: 'John Doe',
                    userId: 456,
                    amount: 49.99,
                    currency: 'USD',
                    method: 'bakong',
                    status: 'paid',
                    date: '2026-03-01T09:00:00Z',
                    transactionType: 'payment',
                    transactionDetails: {
                        hash: '208212f0',
                        fromAccountId: 'sender@bakong',
                        toAccountId: 'receiver@bakong',
                        amount: 49.99,
                        currency: 'USD',
                        description: 'Credit package purchase',
                        proofImageUrl: 'https://res.cloudinary.com/xxx/image/upload/receipt.jpg',
                    },
                },
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Transaction not found' })
    async getTransactionDetails(
        @Param('transactionId') transactionId: string,
    ): Promise<{ success: true; data: TransactionDetailDto }> {
        const txnId = parseInt(transactionId, 10);

        // Try to find as payment first
        const payment = await this.paymentRepo.findOne({
            where: { id: txnId },
            relations: ['user', 'creditPackage'],
        });

        if (payment) {
            const data: TransactionDetailDto = {
                id: payment.id,
                user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
                userId: payment.user?.id || null,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.paymentMethod,
                status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
                date: payment.created_at.toISOString(),
                transactionType: 'payment' as const,
                transactionDetails: payment.transactionDetails || {},
                creditPackage: payment.creditPackage
                    ? {
                        id: payment.creditPackage.id,
                        name: payment.creditPackage.name,
                        credits: payment.creditPackage.credits,
                        bonusCredits: payment.creditPackage.bonusCredits,
                    }
                    : undefined,
            };

            return { success: true, data };
        }

        // Try to find as wallet transaction
        const walletTxn = await this.walletTransactionRepo.findOne({
            where: { id: txnId },
            relations: ['wallet', 'wallet.user'],
        });

        if (walletTxn) {
            const user = walletTxn.wallet?.user;
            const data: TransactionDetailDto = {
                id: walletTxn.id,
                user: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown',
                userId: user?.id || null,
                amount: walletTxn.amount,
                date: walletTxn.created_at.toISOString(),
                transactionType: 'admin_adjustment' as const,
                adjustmentType: walletTxn.type as 'credit' | 'debit' | 'purchase',
                reason: walletTxn.reason,
                balanceBefore: walletTxn.balanceBefore,
                balanceAfter: walletTxn.balanceAfter,
                description: walletTxn.description,
                metadata: walletTxn.metadata,
            };

            return { success: true, data };
        }

        throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
}