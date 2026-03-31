import {
    Controller,
    Post,
    Body,
    Get,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { PaymentService } from '../../services/payment.service';
import { PaymentGateway } from './payment.gateway';
import { Currency } from '../../libs/enums/Payment';

@ApiTags('Payment-Test')
@Controller('payment-test')
export class PaymentTestController {
    private readonly logger = new Logger(PaymentTestController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly gateway: PaymentGateway,
    ) { }

    // ==================== TEST QR GENERATION ====================
    @Post('generate-qr')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Test endpoint: Generate QR code directly',
        description: 'Tests QR code generation without payment flow. Helps debug QR generation issues.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 10.00 },
                currency: { type: 'string', example: 'USD' },
            },
        },
    })
    testGenerateQr(@Body() body: { amount: number; currency?: string }) {
        try {
            this.logger.log('🧪 TEST: Starting QR generation test');

            const amount = body.amount || 10;
            const currencyStr = body.currency || 'USD';
            const currency = (currencyStr as Currency) || Currency.USD;

            this.logger.log(`📊 Test Parameters: amount=${amount}, currency=${currency}`);

            // Step 1: Create QR
            this.logger.log('📍 Step 1: Creating QR code...');
            const qr = this.paymentService.createQR({
                currency,
                amount,
            });

            this.logger.log('✅ QR Code Generated Successfully');
            this.logger.log(`🎯 QR String: ${qr}`);
            this.logger.log(`📏 QR Length: ${qr.length}`);
            this.logger.log(`🔍 QR Prefix (50 chars): ${qr.substring(0, 50)}`);

            // Step 2: Generate MD5
            this.logger.log('📍 Step 2: Generating MD5 hash...');
            const md5 = this.paymentService.generateMD5(qr);
            this.logger.log(`✅ MD5 Generated: ${md5}`);

            return {
                success: true,
                qr,
                md5,
                length: qr.length,
                prefix: qr.substring(0, 50),
                message: 'QR code generated successfully',
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.error('❌ QR Generation Failed', errorMessage);
            return {
                success: false,
                error: errorMessage,
                type: err instanceof Error ? err.constructor.name : 'Unknown',
                message: 'Failed to generate QR code',
            };
        }
    }

    // ==================== TEST QR + WEBSOCKET ====================
    @Post('generate-and-emit-qr')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Test endpoint: Generate QR and emit via WebSocket',
        description: 'Tests QR generation + WebSocket emission. Simulates the full payment flow.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'number', example: 2 },
                amount: { type: 'number', example: 10.00 },
                currency: { type: 'string', example: 'USD' },
            },
        },
    })
    testGenerateAndEmitQr(@Body() body: { userId: number; amount: number; currency?: string }) {
        try {
            this.logger.log('🧪 TEST: Starting QR generation + WebSocket emit test');

            const userId = body.userId;
            const amount = body.amount || 10;
            const currencyStr = body.currency || 'USD';
            const currency = (currencyStr as Currency) || Currency.USD;

            if (!userId) {
                return {
                    success: false,
                    error: 'userId is required',
                    message: 'User ID must be provided',
                };
            }

            this.logger.log(`👤 User ID: ${userId}`);
            this.logger.log(`📊 Amount: ${amount}, Currency: ${currency}`);

            // Step 1: Create QR
            this.logger.log('📍 Step 1: Creating QR code...');
            const qr = this.paymentService.createQR({
                currency,
                amount,
            });

            this.logger.log('✅ QR Code Generated');
            this.logger.log(`🎯 QR String: ${qr}`);

            // Step 2: Generate MD5
            this.logger.log('📍 Step 2: Generating MD5...');
            const md5 = this.paymentService.generateMD5(qr);
            this.logger.log(`✅ MD5: ${md5}`);

            // Step 3: Emit via WebSocket
            this.logger.log('📍 Step 3: Emitting QR via WebSocket...');
            this.gateway.sendQr(userId, qr);
            this.logger.log('✅ WebSocket QR_READY event sent');

            return {
                success: true,
                qr,
                md5,
                length: qr.length,
                prefix: qr.substring(0, 50),
                userId,
                message: 'QR generated and emitted via WebSocket',
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.error('❌ Test Failed', errorMessage);
            return {
                success: false,
                error: errorMessage,
                type: err instanceof Error ? err.constructor.name : 'Unknown',
                message: 'Failed to generate and emit QR',
            };
        }
    }

    // ==================== TEST PAYMENT STATUS EMIT ====================
    @Post('emit-payment-status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Test endpoint: Emit payment status via WebSocket',
        description: 'Tests WebSocket payment status emission.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'number', example: 2 },
                status: { type: 'string', example: 'PAID', enum: ['PAID', 'UNPAID', 'EXPIRED', 'SUCCESS'] },
            },
        },
    })
    testEmitPaymentStatus(@Body() body: { userId: number; status: string }) {
        try {
            this.logger.log('🧪 TEST: Emitting payment status via WebSocket');

            const userId = body.userId;
            const status = body.status || 'PAID';

            if (!userId) {
                return {
                    success: false,
                    error: 'userId is required',
                };
            }

            this.logger.log(`👤 User ID: ${userId}`);
            this.logger.log(`📊 Status: ${status}`);

            this.gateway.sendStatus(userId, status);
            this.logger.log('✅ PAYMENT_STATUS event emitted');

            return {
                success: true,
                userId,
                status,
                message: 'Payment status emitted via WebSocket',
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.error('❌ Emit failed', errorMessage);
            return {
                success: false,
                error: errorMessage,
                message: 'Failed to emit payment status',
            };
        }
    }

    // ==================== HEALTH CHECK ====================
    @Get('health')
    @ApiOperation({
        summary: 'Health check endpoint',
        description: 'Check if payment test controller is working.'
    })
    healthCheck() {
        return {
            status: 'ok',
            message: 'Payment test controller is running',
            endpoints: [
                'POST /payment-test/generate-qr - Test QR generation',
                'POST /payment-test/generate-and-emit-qr - Test QR generation + WebSocket',
                'POST /payment-test/emit-payment-status - Test payment status emission',
                'GET /payment-test/health - Health check',
            ],
        };
    }
}
