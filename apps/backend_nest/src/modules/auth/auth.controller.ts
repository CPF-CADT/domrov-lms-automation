import { Body, Controller, Post, Req, Res, UseGuards,Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { RegisterUserDTO } from '../../../libs/dtos/user/register-user.dto';
import { LoginUserDTO } from '../../../libs/dtos/user/login.dto';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ResendOtpDTO, VerifyOtpDTO } from '../../../libs/dtos/user/email-verification.dto';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) { }

  @Post('sign-up')
  @ApiOperation({ summary: 'create new user' })
  @ApiBody({ type: RegisterUserDTO })
  signUp(@Body() createUserDto: RegisterUserDTO) {
    return this.authService.signUp(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login into system' })
  @ApiBody({ type: LoginUserDTO })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() loginDto: LoginUserDTO) {
    const { refreshToken, ...loginResponse } = await this.authService.login(loginDto);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return loginResponse;
  }

  @UseGuards(AuthGuard('refresh-jwt'))
  @Post('refresh-token')
  @ApiOperation({ summary: 'Get new acess token' })
  async refreshToken(@Req() req, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    const accessToken = await this.authService.refreshToken(user.id, user.email);
    const issuedAt = Math.floor(Date.now() / 1000);
    return {
      status: 'success',
      accessToken,
      issuedAt
    };
  }

  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new Error('Refresh token missing');
    }

    await this.authService.logout(user.id, refreshToken);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return {
      status: 'success',
      message: 'Logged out from current device',
    };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with OTP' })
  @ApiBody({ type: VerifyOtpDTO })
  async verifyOtp(@Body() body: VerifyOtpDTO) {
    const { email, otp } = body;
    const result = await this.authService.verifyEmailOtp(email, otp);

    return {
      status: 'success',
      message: result ? 'Email verified successfully' : 'Invalid or expired OTP',
    };
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend OTP email for verification' })
  @ApiBody({ type: ResendOtpDTO })
  async resendOtp(@Body() body: ResendOtpDTO) {
    const { email } = body;
    const result = await this.authService.sendVerificationEmail(email);

    return {
      status: 'success',
      message: result ? 'OTP sent successfully' : 'User not found or already verified',
    };
  }
  // @Public()
  
  @Get('google/login')
  // @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    
  }

  @Get('google/callback')
  // @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req) {
    return {
      message: 'Google login successful!',
      user: req.user,
    };
  }


}
