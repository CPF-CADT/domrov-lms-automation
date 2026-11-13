import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordRequest, CompletePasswordResetRequest, LoginRequest, PasswordResetRequest, RefreshRequest, RegisterRequest, UpdateProfileRequest, VerifyEmailRequest } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterRequest) { return this.auth.register(input); }

  // Legacy monolith route and response shape used by the existing frontend.
  @Post('sign-up')
  async signUp(@Body() input: RegisterRequest) { return { success: true, data: await this.auth.register(input) }; }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() input: LoginRequest, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...data } = await this.auth.login(input);
    response.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { success: true, data };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() input: RefreshRequest) { return this.auth.refresh(input.refreshToken); }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async legacyRefresh(@Req() request: Request & { cookies?: Record<string, string> }, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');
    const result = await this.auth.refresh(refreshToken);
    return { success: true, data: { status: 'success', accessToken: result.accessToken, issuedAt: Math.floor(Date.now() / 1000) } };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request & { user: { sub: number }; cookies?: Record<string, string> }, @Headers('x-refresh-token') headerRefreshToken?: string, @Res({ passthrough: true }) response?: Response) {
    const refreshToken = headerRefreshToken ?? request.cookies?.refresh_token;
    if (!refreshToken) return;
    await this.auth.logout(request.user.sub, refreshToken);
    response?.clearCookie('refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return { success: true, data: { status: 'success', message: 'Logged out from current device' } };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() input: VerifyEmailRequest, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...data } = await this.auth.verifyEmail(input);
    response.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { success: true, data: { ...data, message: 'Email verified successfully' } };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() input: PasswordResetRequest) { return { success: true, data: await this.auth.requestPasswordReset(input) }; }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() input: PasswordResetRequest) { return { success: true, data: await this.auth.resendVerification(input.email) }; }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() input: CompletePasswordResetRequest) { return { success: true, data: await this.auth.resetPassword(input) }; }
}

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async currentUser(@Req() request: Request & { user: { sub: number } }) { return { success: true, data: await this.auth.currentUser(request.user.sub) }; }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(@Req() request: Request & { user: { sub: number } }, @Body() input: UpdateProfileRequest) {
    return { success: true, data: await this.auth.updateProfile(request.user.sub, input) };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() request: Request & { user: { sub: number } }, @Body() input: ChangePasswordRequest) {
    return { success: true, data: await this.auth.changePassword(request.user.sub, input) };
  }
}
