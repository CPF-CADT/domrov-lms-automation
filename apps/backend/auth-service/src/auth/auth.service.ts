import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { ChangePasswordRequest, CompletePasswordResetRequest, LoginRequest, PasswordResetRequest, RegisterRequest, UpdateProfileRequest, VerifyEmailRequest } from './auth.dto';
import { OtpPurpose, UserEmailOtp } from '../entities/user-email-otp.entity';
import { SystemRole, User, UserStatus } from '../entities/user.entity';
import { UserRefreshToken } from '../entities/user-refresh-token.entity';
import { MailerService } from '../mailer/mailer.service';
import { OAuthAccount } from '../entities/oauth-account.entity';

export interface AuthUser {
  sub: number;
  email: string;
  role: SystemRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserRefreshToken) private readonly refreshTokens: Repository<UserRefreshToken>,
    @InjectRepository(UserEmailOtp) private readonly otps: Repository<UserEmailOtp>,
    @InjectRepository(OAuthAccount) private readonly oauthAccounts: Repository<OAuthAccount>,
    @Inject('ACCESS_JWT_SERVICE') private readonly accessJwt: JwtService,
    @Inject('REFRESH_JWT_SERVICE') private readonly refreshJwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  async register(input: RegisterRequest) {
    if (input.password !== input.confirmPassword) throw new BadRequestException('Password does not match');
    this.validatePassword(input.password);
    const email = input.email.toLowerCase();
    if (await this.users.findOne({ where: { email } })) throw new ConflictException('Email already registered');

    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      password: await bcrypt.hash(input.password, 10),
      gender: input.gender,
      profilePictureUrl: input.profilePictureUrl,
      status: UserStatus.ACTIVE,
      role: SystemRole.USER,
      isVerified: false,
      isTwoFactorEnable: false,
    });
    const saved = await this.users.save(user);
    await this.sendOtp(saved, OtpPurpose.VERIFICATION);
    return { userId: saved.id, firstName: saved.firstName, lastName: saved.lastName, email: saved.email };
  }

  async login(input: LoginRequest) {
    const user = await this.users.findOne({ where: { email: input.email.toLowerCase() } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified) throw new BadRequestException('User account is not verified');
    if (!(await bcrypt.compare(input.password, user.password))) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: AuthUser;
    try {
      payload = await this.refreshJwt.verifyAsync<AuthUser>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    const session = await this.refreshTokens.findOne({ where: { userId: payload.sub, refreshToken }, relations: { user: true } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('Refresh token is invalid or expired');
    const accessToken = await this.accessJwt.signAsync({ sub: session.user.id, email: session.user.email, role: session.user.role });
    return { accessToken, refreshToken, expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h') };
  }

  async oauthAuthorizationUrl(provider: string) {
    const normalized = provider.toLowerCase();
    const config = this.oauthConfig(normalized);
    if (!config) throw new ServiceUnavailableException(`OAuth provider ${provider} is not configured`);
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callbackUrl, response_type: 'code', scope: config.scope, state: normalized });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async oauthCallback(provider: string, code: string) {
    const normalized = provider.toLowerCase();
    const config = this.oauthConfig(normalized);
    if (!config) throw new ServiceUnavailableException(`OAuth provider ${provider} is not configured`);
    if (!code) throw new UnauthorizedException('OAuth authorization code is required');
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.callbackUrl, grant_type: 'authorization_code' }),
    });
    if (!tokenResponse.ok) throw new UnauthorizedException('OAuth token exchange failed');
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new UnauthorizedException('OAuth provider did not return an access token');
    const profileResponse = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' } });
    if (!profileResponse.ok) throw new UnauthorizedException('OAuth profile request failed');
    const profile = await profileResponse.json() as Record<string, any>;
    const normalizedProfile = normalized === 'google'
      ? { id: profile.sub, email: profile.email, firstName: profile.given_name, lastName: profile.family_name, avatar: profile.picture }
      : { id: String(profile.id), email: profile.email, firstName: profile.name?.split(' ')[0] ?? profile.login, lastName: profile.name?.split(' ').slice(1).join(' ') ?? '', avatar: profile.avatar_url };
    if (!normalizedProfile.id || !normalizedProfile.email) throw new UnauthorizedException('OAuth provider returned an incomplete profile');

    const account = await this.oauthAccounts.findOne({ where: { provider: normalized, accountId: normalizedProfile.id }, relations: { user: true } });
    let user = account?.user;
    if (!user) {
      user = await this.users.findOne({ where: { email: normalizedProfile.email.toLowerCase() } }) ?? undefined;
      if (!user) user = await this.users.save(this.users.create({ firstName: normalizedProfile.firstName || 'OAuth', lastName: normalizedProfile.lastName || 'User', email: normalizedProfile.email.toLowerCase(), password: await bcrypt.hash(`oauth:${normalized}:${normalizedProfile.id}:${Date.now()}`, 10), profilePictureUrl: normalizedProfile.avatar, status: UserStatus.ACTIVE, role: SystemRole.USER, isVerified: true, isTwoFactorEnable: false }));
      await this.oauthAccounts.save(this.oauthAccounts.create({ provider: normalized, accountId: normalizedProfile.id, user, userId: user.id }));
    }
    return this.issueTokens(user);
  }

  async logout(userId: number, refreshToken: string) {
    const result = await this.refreshTokens.delete({ userId, refreshToken });
    if (!result.affected) throw new NotFoundException('Session not found or already expired');
  }

  async currentUser(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      dob: user.dob,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
      isVerified: user.isVerified,
      isTwoFactorEnable: user.isTwoFactorEnable,
      status: user.status,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async updateProfile(userId: number, input: UpdateProfileRequest) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (input.phoneNumber && input.phoneNumber !== user.phoneNumber) {
      const existing = await this.users.findOne({ where: { phoneNumber: input.phoneNumber } });
      if (existing && existing.id !== userId) throw new BadRequestException('Phone number already in use');
    }
    Object.assign(user, input);
    await this.users.save(user);
    return { message: 'Profile updated successfully', user: await this.currentUser(userId) };
  }

  async changePassword(userId: number, input: ChangePasswordRequest) {
    if (input.newPassword !== input.confirmPassword) throw new BadRequestException('New password and confirmation do not match');
    this.validatePassword(input.newPassword);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(input.currentPassword, user.password))) throw new UnauthorizedException('Current password is incorrect');
    if (await bcrypt.compare(input.newPassword, user.password)) throw new BadRequestException('New password must be different from current password');
    user.password = await bcrypt.hash(input.newPassword, 10);
    await this.users.save(user);
    await this.refreshTokens.delete({ userId });
    return { message: 'Password changed successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.findUserByEmail(email);
    if (user.isVerified) throw new BadRequestException('Email is already verified');
    await this.sendOtp(user, OtpPurpose.VERIFICATION);
    return { message: 'Verification OTP sent successfully' };
  }

  async verifyEmail(input: VerifyEmailRequest) {
    const user = await this.findUserByEmail(input.email);
    if (user.isVerified) throw new BadRequestException('Email is already verified');
    const record = await this.otps.findOne({ where: { userId: user.id, purpose: OtpPurpose.VERIFICATION } });
    if (!record || record.expiresAt <= new Date() || record.otp !== input.otp) throw new BadRequestException('Invalid or expired verification code');
    user.isVerified = true;
    await this.users.save(user);
    await this.otps.delete(record.id);
    return this.issueTokens(user);
  }

  async requestPasswordReset(input: PasswordResetRequest) {
    const user = await this.users.findOne({ where: { email: input.email.toLowerCase() } });
    if (user) await this.sendOtp(user, OtpPurpose.PASSWORD_RESET);
    return { message: 'If the email exists, a password reset code was sent.' };
  }

  async resetPassword(input: CompletePasswordResetRequest) {
    this.validatePassword(input.newPassword);
    const user = await this.findUserByEmail(input.email);
    const record = await this.otps.findOne({ where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET } });
    if (!record || record.expiresAt <= new Date() || record.otp !== input.otp) throw new BadRequestException('Invalid or expired password reset code');
    user.password = await bcrypt.hash(input.newPassword, 10);
    await this.users.save(user);
    await this.otps.delete(record.id);
    await this.refreshTokens.delete({ userId: user.id });
    return { message: 'Password reset successfully' };
  }

  private async issueTokens(user: User) {
    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.accessJwt.signAsync(payload);
    const refreshToken = await this.refreshJwt.signAsync(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokens.save(this.refreshTokens.create({ user, userId: user.id, refreshToken, expiresAt }));
    return { accessToken, refreshToken, expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h') };
  }

  private async sendOtp(user: User, purpose: OtpPurpose) {
    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    let record = await this.otps.findOne({ where: { userId: user.id } });
    if (!record) record = this.otps.create({ user, userId: user.id, otp, purpose, expiresAt });
    else Object.assign(record, { otp, purpose, expiresAt });
    await this.otps.save(record);
    await this.mailer.sendOtp(user.email, otp, purpose);
  }

  private async findUserByEmail(email: string) {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    if (!user) throw new BadRequestException('Invalid or expired code');
    return user;
  }

  private validatePassword(password: string) {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      throw new BadRequestException('Password must be at least 8 characters and contain uppercase, number, and special character');
    }
  }

  private oauthConfig(provider: string) {
    if (provider !== 'google' && provider !== 'github') return undefined;
    const prefix = provider === 'google' ? 'GOOGLE' : 'GITHUB';
    const legacyPrefix = provider === 'github' ? 'GIT_HUB' : prefix;
    const clientId = this.config.get<string>(`${prefix}_CLIENT_ID`) ?? this.config.get<string>(`${legacyPrefix}_CLIENT_ID`);
    const clientSecret = this.config.get<string>(`${prefix}_CLIENT_SECRET`) ?? this.config.get<string>(`${legacyPrefix}_CLIENT_SECRET`);
    const callbackUrl = this.config.get<string>(`${prefix}_CALLBACK_URL`) ?? this.config.get<string>(`${legacyPrefix}_CALLBACK_URL`);
    if (!clientId || !clientSecret || !callbackUrl) return undefined;
    return provider === 'google'
      ? { clientId, clientSecret, callbackUrl, scope: 'openid email profile', authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo' }
      : { clientId, clientSecret, callbackUrl, scope: 'read:user user:email', authorizationUrl: 'https://github.com/login/oauth/authorize', tokenUrl: 'https://github.com/login/oauth/access_token', profileUrl: 'https://api.github.com/user' };
  }
}
