import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
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
  async refresh(@Body() input: RefreshRequest, @Req() request: Request & { cookies?: Record<string, string> }, @Res({ passthrough: true }) response: Response) {
    const refreshToken = input.refreshToken ?? request.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');
    const result = await this.auth.refresh(refreshToken);
    this.setRefreshCookie(response, result.refreshToken);
    return { success: true, data: { accessToken: result.accessToken, expiresIn: result.expiresIn } };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async legacyRefresh(@Req() request: Request & { cookies?: Record<string, string> }, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');
    const result = await this.auth.refresh(refreshToken);
    this.setRefreshCookie(response, result.refreshToken);
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

  @Get(':provider/login')
  async oauthLogin(@Param('provider') provider: string, @Res() response: Response) {
    const state = randomBytes(32).toString('base64url');
    const authorizationUrl = await this.auth.oauthAuthorizationUrl(provider, state);
    response.cookie('oauth_state', state, this.oauthStateCookieOptions());
    return response.redirect(authorizationUrl);
  }

  @Get(':provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() request: Request & { cookies?: Record<string, string> },
    @Res() response: Response,
  ) {
    const cookieState = request.cookies?.oauth_state;
    response.clearCookie('oauth_state', this.oauthStateCookieOptions());
    const result = await this.auth.oauthCallback(provider, code, state, cookieState);
    this.setRefreshCookie(response, result.refreshToken);
    return response.redirect(this.auth.frontendOAuthCallbackUrl());
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() input: CompletePasswordResetRequest) { return { success: true, data: await this.auth.resetPassword(input) }; }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  private oauthStateCookieOptions() {
    return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 5 * 60 * 1000, path: '/auth' };
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async currentUser(@Req() request: Request & { user: { sub: number } }) { return { success: true, data: await this.auth.currentUser(request.user.sub) }; }

  @Get('details')
  @UseGuards(JwtAuthGuard)
  async details(@Req() request: Request & { user: { sub: number } }) { return { success: true, data: await this.auth.currentUser(request.user.sub) }; }

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
