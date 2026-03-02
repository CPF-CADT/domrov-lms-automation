import {
    Controller,
    Post,
    UseGuards,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Body,
} from '@nestjs/common';

import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiOkResponse,
    ApiNotFoundResponse,
    ApiUnauthorizedResponse,
    ApiParam,
    ApiBadRequestResponse,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentFlowService } from './payment-flow.service';
import { UserId } from '../../common/decorators/user.decorator';
import { StartPaymentResponseDto } from '../../libs/dtos/wallet/start-payment-response.dto';
import { CheckTransactionByHashDto, CheckTransactionResponseDto } from '../../libs/dtos/wallet/check-transaction-by-hash.dto';


@ApiTags('Payment')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentFlowService,
    ) { }

    // ==================== START PAYMENT ====================
    @Post('start-payment/:packageId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Initiate payment for a credit package',
        description: 'Starts the payment flow for purchasing a credit package. A QR code will be sent via WebSocket for payment completion.'
    })
    @ApiParam({
        name: 'packageId',
        type: Number,
        description: 'ID of the credit package to purchase',
        example: 1
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    paymentId: 123,
                    message: 'Payment initiated'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'Credit package not found',
        example: {
            statusCode: 404,
            message: 'Credit package not found',
            error: 'Not Found'
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
    async startPaymentEndpoint(
        @Param('packageId', ParseIntPipe) packageId: number,
        @UserId() userId: number,
    ): Promise<{ success: true; data: StartPaymentResponseDto }> {
        const data = await this.paymentService.startPayment(userId, packageId);
        return { success: true, data };
    }


    // ==================== CHECK TRANSACTION BY SHORT HASH ====================
    @Post('check_transaction_by_short_hash')
    @ApiOperation({
        summary: 'Check Transaction Status by Short Hash',
        description: 'Verify a Bakong transaction using its 8-character short hash and amount. Returns transaction details if found.',
    })
    @ApiBody({
        description: 'Check transaction request with hash, amount, and currency',
        type: CheckTransactionByHashDto,
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    responseCode: 0,
                    responseMessage: 'Getting transaction successfully.',
                    data: {
                        hash: '8465d723',
                        fromAccountId: 'rieu_dhqj_1984@devb',
                        toAccountId: 'bridge_account@devb',
                        currency: 'USD',
                        amount: 1.0,
                        description: 'testing bakong generator',
                        createdDateMs: 1586852120700.0,
                        acknowledgedDateMs: 1586852123544.0,
                    },
                }
            }
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid request parameters',
        example: {
            statusCode: 400,
            message: 'Hash must be exactly 8 characters',
            error: 'Bad Request',
        },
    })
    @ApiNotFoundResponse({
        description: 'Transaction not found in system',
        example: {
            responseCode: 1,
            responseMessage: 'Transaction could not be found. Please check and try again.',
            data: null,
            errorCode: 1,
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
    async checkTransactionByHash(
        @Body() dto: CheckTransactionByHashDto,
    ): Promise<{ success: true; data: CheckTransactionResponseDto }> {
        const data = await this.paymentService.verifyTransactionByHash(
            dto.hash,
            dto.amount,
            dto.currency,
        );
        return { success: true, data };
    }
}
