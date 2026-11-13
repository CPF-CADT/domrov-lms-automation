import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from '../src/auth/auth.service';
import { UserEmailOtp } from '../src/entities/user-email-otp.entity';
import { UserRefreshToken } from '../src/entities/user-refresh-token.entity';
import { User, UserStatus } from '../src/entities/user.entity';
import { MailerService } from '../src/mailer/mailer.service';
import { OAuthAccount } from '../src/entities/oauth-account.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let users: any;

  beforeEach(async () => {
    users = {
      findOne: jest.fn(),
      create: jest.fn((input) => input as User),
      save: jest.fn(async (input) => ({ ...input, id: 1 }) as User),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(UserRefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(UserEmailOtp), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((input) => input), delete: jest.fn() } },
        { provide: getRepositoryToken(OAuthAccount), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((input) => input) } },
        { provide: 'ACCESS_JWT_SERVICE', useValue: { signAsync: jest.fn(async (payload) => `token-${payload.sub}`), verifyAsync: jest.fn() } },
        { provide: 'REFRESH_JWT_SERVICE', useValue: { signAsync: jest.fn(async (payload) => `refresh-${payload.sub}`), verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn((_key, fallback) => fallback), getOrThrow: jest.fn(() => 'test-secret') } },
        { provide: MailerService, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects a weak password before persistence', async () => {
    await expect(service.register({ firstName: 'Sok', lastName: 'Dara', email: 'sok@example.com', password: 'weakpass', confirmPassword: 'weakpass' })).rejects.toThrow('Password must be at least 8 characters');
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rejects login for an unverified user', async () => {
    users.findOne!.mockResolvedValue({ id: 1, email: 'sok@example.com', status: UserStatus.ACTIVE, isVerified: false } as User);
    await expect(service.login({ email: 'sok@example.com', password: 'P@ssword1' })).rejects.toThrow('User account is not verified');
  });

  it('resends verification through the existing auth database and mailer boundary', async () => {
    const user = { id: 1, email: 'sok@example.com', isVerified: false } as User;
    users.findOne!.mockResolvedValue(user);
    const otpRepository = (service as any).otps;
    otpRepository.findOne.mockResolvedValue(undefined);
    await expect(service.resendVerification(user.email)).resolves.toEqual({ message: 'Verification OTP sent successfully' });
  });

  it('returns a safe configuration error when OAuth is not configured', async () => {
    await expect(service.oauthAuthorizationUrl('google')).rejects.toThrow('OAuth provider google is not configured');
  });

  it('updates the authenticated profile without changing the email identity', async () => {
    const user = { id: 1, email: 'sok@example.com', firstName: 'Sok', lastName: 'Dara', status: UserStatus.ACTIVE } as User;
    users.findOne!.mockResolvedValue(user);
    await expect(service.updateProfile(1, { firstName: 'Sokha', phoneNumber: '0123456789' })).resolves.toMatchObject({ message: 'Profile updated successfully' });
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Sokha', phoneNumber: '0123456789' }));
  });

  it('changes the password and invalidates refresh sessions', async () => {
    const password = await bcrypt.hash('OldP@ssword1', 10);
    const user = { id: 1, email: 'sok@example.com', password, status: UserStatus.ACTIVE } as User;
    users.findOne!.mockResolvedValue(user);
    await expect(service.changePassword(1, { currentPassword: 'OldP@ssword1', newPassword: 'NewP@ssword2', confirmPassword: 'NewP@ssword2' })).resolves.toEqual({ message: 'Password changed successfully' });
    expect((service as any).refreshTokens.delete).toHaveBeenCalledWith({ userId: 1 });
  });
});
