import { Controller, Get, Query, UseGuards, Request, Post, Body } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiOkResponse,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiQuery,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { CreditPackageService } from './credit-package.service';
import { PaymentFlowService } from './payment-flow.service';
import { UserId } from '../../common/decorators/user.decorator';
import {
    TransactionHistoryQueryDto,
    WalletBalanceResponseDto,
    TransactionHistoryResponseDto,
} from '../../libs/dtos/wallet/wallet.dto';
import { CreditPackageResponseDto } from '../../libs/dtos/wallet/credit-package-response.dto';
import { SubmitPaymentProofDto, SubmitPaymentProofResponseDto } from '../../libs/dtos/wallet/submit-payment-proof.dto';
import { ParseIntPipe } from '@nestjs/common/pipes';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
    constructor(
        private walletService: WalletService,
        private creditPackageService: CreditPackageService,
        private paymentFlowService: PaymentFlowService,
    ) { }

    // ==================== GET BALANCE ====================
    @Get('balance')
    @ApiOperation({
        summary: 'Get current credit balance',
        description: 'Retrieves the current credit balance for the authenticated user. Creates a wallet if one doesn\'t exist.'
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    userId: 1,
                    creditBalance: 150.50
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'User not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async getBalance(@Request() req): Promise<{ success: true; data: WalletBalanceResponseDto }> {
        const userId = req.user.id;
        const creditBalance = await this.walletService.getBalance(userId);
        const data = { userId, creditBalance };
        return { success: true, data };
    }

    // ==================== GET TRANSACTION HISTORY ====================
    @Get('transactions')
    @ApiOperation({
        summary: 'Get transaction history',
        description: 'Retrieves paginated transaction history for the authenticated user including credits added, deductions, purchases, and refunds.'
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default: 10)' })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    data: [
                        {
                            id: 1,
                            walletId: 1,
                            amount: 50.00,
                            type: 'credit',
                            reason: 'purchase',
                            balanceBefore: 100.00,
                            balanceAfter: 150.00,
                            description: 'Added 50 credits via purchase',
                            metadata: null,
                            created_at: '2024-01-15T10:30:00Z'
                        }
                    ],
                    meta: {
                        total: 25,
                        page: 1,
                        limit: 10,
                        totalPages: 3
                    }
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'User not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async getTransactionHistory(
        @Request() req,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    ): Promise<{ success: true; data: TransactionHistoryResponseDto }> {
        const userId = req.user.id;
        const data = await this.walletService.getTransactionHistory(userId, page, limit);
        return { success: true, data };
    }

    // ==================== GET AVAILABLE PACKAGES ====================
    @Get('packages')
    @ApiOperation({
        summary: 'List credit packages available for purchase',
        description: 'Retrieves all active credit packages that users can purchase. Sorted by display order and price.'
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
                        name: 'Premium Pack',
                        description: 'Best value for power users',
                        credits: 500,
                        bonusCredits: 100,
                        price: 39.99,
                        currency: 'USD',
                        discountInPercent: 10,
                        isActive: true,
                        sortOrder: 2,
                        created_at: '2024-01-15T10:30:00Z',
                        updated_at: '2024-01-15T10:30:00Z'
                    }
                ]
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'User not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async getPackages(): Promise<{ success: true; data: CreditPackageResponseDto[] }> {
        const data = await this.creditPackageService.findAllActive();
        return { success: true, data };
    }

    // ==================== SUBMIT PAYMENT PROOF ====================
    @Post('transactions/submit-payment-proof')
    @ApiOperation({
        summary: 'Submit payment proof for manual verification',
        description: 'User submits payment proof (hash and image) to verify a Bakong payment and receive credits. The endpoint validates the payment, confirms the amount matches the package, and credits the user wallet.',
    })
    @ApiOkResponse({
        description: 'Payment verified and credits applied',
        schema: {
            example: {
                success: true,
                data: {
                    transactionId: 123,
                    message: 'Payment verified and credits applied',
                    creditsApplied: 50,
                }
            }
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid payment data or validation failed',
        example: {
            statusCode: 400,
            message: 'Payment hash must be exactly 8 characters',
            error: 'Bad Request',
        },
    })
    @ApiNotFoundResponse({
        description: 'Credit package not found',
        example: {
            statusCode: 404,
            message: 'Credit package not found',
            error: 'Not Found',
        },
    })
    @ApiUnauthorizedResponse({
        description: 'User not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized',
        },
    })
    async submitPaymentProof(
        @Body() dto: SubmitPaymentProofDto,
        @UserId() userId: number,
    ): Promise<{ success: true; data: SubmitPaymentProofResponseDto }> {
        const data = await this.paymentFlowService.submitPaymentProof(
            userId,
            dto.paymentHash,
            dto.imageUrl,
            dto.packageId,
        );
        return { success: true, data };
    }
}