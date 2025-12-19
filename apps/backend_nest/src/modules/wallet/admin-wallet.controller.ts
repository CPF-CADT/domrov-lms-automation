import { Body, Controller, Get, Post, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenPackageService } from './token-package.service';
import { WalletService } from './wallet.service';
import { CreateTokenPackageDTO } from '../../../libs/dtos/wallet/create-package.dto';
import { AdminAdjustWalletDTO } from '../../../libs/dtos/wallet/admin-adjust-wallet.dto';

@ApiTags('Wallet (Admin)')
@Controller('admin/wallet')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('ADMIN')
@ApiBearerAuth()
export class AdminWalletController {
    constructor(
        private packageService: TokenPackageService,
        private walletService: WalletService
    ) { }

    @Post('packages')
    @ApiOperation({ summary: 'Create new token package' })
    async createPackage(@Body() dto: CreateTokenPackageDTO) {
        return this.packageService.create(dto);
    }

    @Get('packages')
    @ApiOperation({ summary: 'View all packages (active & inactive)' })
    async getAllPackages() {
        return this.packageService.findAllAdmin();
    }

    @Patch('packages/:id/toggle')
    @ApiOperation({ summary: 'Activate/Deactivate package' })
    async togglePackage(@Param('id', ParseIntPipe) id: number) {
        return this.packageService.toggleStatus(id);
    }

    @Post('adjust')
    @ApiOperation({ summary: 'Manually add/remove tokens from user (Refund/Bonus)' })
    async manualAdjustment(@Body() dto: AdminAdjustWalletDTO) {
        // If amount is positive, it adds. If negative, the logic below handles it.
        if (dto.amount >= 0) {
            return this.walletService.addTokens(dto.userId, dto.amount, dto.type, dto.description);
        } else {
            // Pass positive number to deduct method
            return this.walletService.deductTokens(dto.userId, Math.abs(dto.amount), dto.description);
        }
    }
}