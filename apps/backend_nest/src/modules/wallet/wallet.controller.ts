import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { UserId } from '../../common/decorators/user.decorator';
import { TokenPackageService } from './token-package.service';

@ApiTags('Wallet (User)')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private walletService: WalletService,
    private packageService: TokenPackageService
  ) { }

  @Get('balance')
  @ApiOperation({ summary: 'Get current token balance' })
  async getBalance(@UserId() userId: number) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  async getHistory(@UserId() userId: number) {
    return this.walletService.getTransactionHistory(userId);
  }

  @Get('packages')
  @ApiOperation({ summary: 'List packages available for purchase' })
  async getPackages() {
    return this.packageService.findAllActive();
  }
}