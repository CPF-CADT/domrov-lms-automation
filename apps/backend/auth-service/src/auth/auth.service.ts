import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { CompletePasswordResetRequest, LoginRequest, PasswordResetRequest, RegisterRequest, VerifyEmailRequest } from './auth.dto';
import { OtpPurpose, UserEmailOtp } from '../entities/user-email-otp.entity';
import { SystemRole, User, UserStatus } from '../entities/user.entity';
import { UserRefreshToken } from '../entities/user-refresh-token.entity';
import { MailerService } from '../mailer/mailer.service';

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

  async logout(userId: number, refreshToken: string) {
    const result = await this.refreshTokens.delete({ userId, refreshToken });
    if (!result.affected) throw new NotFoundException('Session not found or already expired');
  }

  async currentUser(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { id: String(user.id), email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
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
}
