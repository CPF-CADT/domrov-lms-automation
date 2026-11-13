import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CompletePasswordResetRequest, LoginRequest, PasswordResetRequest, RefreshRequest, RegisterRequest, VerifyEmailRequest } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterRequest) { return this.auth.register(input); }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginRequest) { return this.auth.login(input); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() input: RefreshRequest) { return this.auth.refresh(input.refreshToken); }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request & { user: { sub: number }; cookies?: Record<string, string> }, @Headers('x-refresh-token') headerRefreshToken?: string) {
    const refreshToken = headerRefreshToken ?? request.cookies?.refresh_token;
    if (!refreshToken) return;
    await this.auth.logout(request.user.sub, refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() input: VerifyEmailRequest) { return this.auth.verifyEmail(input); }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() input: PasswordResetRequest) { return this.auth.requestPasswordReset(input); }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() input: CompletePasswordResetRequest) { return this.auth.resetPassword(input); }
}

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  currentUser(@Req() request: Request & { user: { sub: number } }) { return this.auth.currentUser(request.user.sub); }
}
