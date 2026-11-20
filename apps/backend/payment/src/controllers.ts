import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtBoundaryGuard, ServiceAuthGuard } from './auth.guard';
import { PaymentService, assertUser } from './payment.service';

@Controller()
export class WalletController {
  constructor(private readonly service: PaymentService) {}
  @Get('wallet') @UseGuards(JwtBoundaryGuard)
  wallet(@Req() req: any) { return this.service.wallet(assertUser(req.user)); }
  @Get('wallet/balance') @UseGuards(JwtBoundaryGuard)
  balance(@Req() req: any) { return this.service.wallet(assertUser(req.user)); }
  @Get('wallet/transactions') @UseGuards(JwtBoundaryGuard)
  transactions(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) { return this.service.userTransactions(assertUser(req.user), Number(page) || 1, Number(limit) || 10); }
  @Get('payments') @UseGuards(JwtBoundaryGuard)
  payments(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) { return this.service.userPayments(assertUser(req.user), Number(page) || 1, Number(limit) || 10); }
  @Get('payments/:id/status') @UseGuards(JwtBoundaryGuard)
  paymentStatus(@Req() req: any, @Param('id') id: string) { return this.service.userPaymentStatus(assertUser(req.user), id); }
  @Delete('payments/:id') @UseGuards(JwtBoundaryGuard)
  deletePayment(@Req() req: any, @Param('id') id: string) { return this.service.deletePendingPayment(assertUser(req.user), id); }
  @Get('credit-packages') packages() { return this.service.packagesList(); }
  @Get('wallet/packages') packagesAlias() { return this.service.packagesList(); }
  @Post('payments') @UseGuards(JwtBoundaryGuard) payment(@Req() req: any, @Headers('idempotency-key') key: string, @Body() body: { creditPackageId: string }) { const userId = assertUser(req.user); return this.service.createPayment(userId, body.creditPackageId, key || `payment:${userId}:${body.creditPackageId}`); }
  @Post('payments/:id/proof') @UseGuards(JwtBoundaryGuard) @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) }))
  proof(@Req() req: any, @Param('id') id: string, @UploadedFile() file?: { buffer?: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Upload a JPG, PNG, or WebP receipt image');
    return this.service.verifyPaymentProof(assertUser(req.user), id, file.buffer);
  }
  @Post('wallet/refund') @UseGuards(ServiceAuthGuard) refund(@Headers('idempotency-key') key: string, @Body() body: { userId: string; amount: number; referenceId: string }) { return this.service.refund(body.userId, body.amount, body.referenceId, key); }
}
@Controller('credits/reservations') export class ReservationController { constructor(private readonly service: PaymentService) {} @Post() @UseGuards(ServiceAuthGuard) reserve(@Headers('idempotency-key') key: string, @Body() body: { userId: string; amount: number; referenceId: string }) { return this.service.reserve(body, key); } @Post(':id/commit') @UseGuards(ServiceAuthGuard) commit(@Param('id') id: string, @Headers('idempotency-key') key: string) { return this.service.transition(id, 'committed', key); } @Post(':id/release') @UseGuards(ServiceAuthGuard) release(@Param('id') id: string, @Headers('idempotency-key') key: string) { return this.service.transition(id, 'released', key); } }
