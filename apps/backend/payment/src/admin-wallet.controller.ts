import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min, MinLength } from 'class-validator';
import { AdminRoleGuard, JwtBoundaryGuard } from './auth.guard';
import { PaymentService, assertUser } from './payment.service';

class CreditPackageDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0.0001) credits!: number;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsNumber() @Min(0) bonusCredits?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class WalletAdjustmentDto {
  @IsString() userId!: string;
  @IsNumber() amount!: number;
  @IsString() @MinLength(1) reason!: string;
  @IsString() @MinLength(1) description!: string;
}

@Controller('admin/wallet')
@UseGuards(JwtBoundaryGuard, AdminRoleGuard)
export class AdminWalletController {
  constructor(private readonly service: PaymentService) {}

  @Post('packages') async createPackage(@Body() body: CreditPackageDto) { return { success: true, data: await this.service.adminCreatePackage(body) }; }
  @Get('packages') async listPackages() { return { success: true, data: await this.service.adminListPackages() }; }
  @Patch('packages/:id') async updatePackage(@Param('id') id: string, @Body() body: Partial<CreditPackageDto>) { return { success: true, data: await this.service.adminUpdatePackage(id, body) }; }
  @Patch('packages/:id/toggle') async togglePackage(@Param('id') id: string) { return { success: true, data: await this.service.adminTogglePackage(id) }; }
  @Delete('packages/:id') async deletePackage(@Param('id') id: string) { return { success: true, data: await this.service.adminDeletePackage(id) }; }

  @Post('adjust') async adjust(@Req() req: any, @Headers('idempotency-key') key: string, @Body() body: WalletAdjustmentDto) {
    return { success: true, data: await this.service.adminAdjustWallet({ ...body, adminId: assertUser(req.user) }, key) };
  }

  @Get('transactions') async transactions(@Query() query: { page?: number; limit?: number; transactionType?: string; userId?: string }) {
    return { success: true, data: await this.service.adminListTransactions(query) };
  }

  @Get('transactions/:transactionId') async transaction(@Param('transactionId') id: string) {
    return { success: true, data: await this.service.adminGetTransaction(id) };
  }
}
