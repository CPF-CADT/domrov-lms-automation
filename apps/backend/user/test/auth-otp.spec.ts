import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { createHmac, randomBytes } from 'crypto'
import { AuthService } from '../src/auth/auth.service'
import { otpHashSecret, validateOtpConfiguration } from '../src/auth/otp.config'
import { OAuthAccount } from '../src/entities/oauth-account.entity'
import { OtpPurpose, UserEmailOtp } from '../src/entities/user-email-otp.entity'
import { UserRefreshToken } from '../src/entities/user-refresh-token.entity'
import { SystemRole, User, UserStatus } from '../src/entities/user.entity'
import { MailerService } from '../src/mailer/mailer.service'
import { OtpTestStore } from './support/otp-store'

describe('OTP security with transactional persistence model', () => {
  let service: AuthService
  let user: User
  let store: OtpTestStore
  let secret: string
  let delivered: string
  let users: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock }
  let mailer: { sendOtp: jest.Mock }
  let refresh: { create: jest.Mock; save: jest.Mock; delete: jest.Mock }
  let accessJwt: JwtService
  const code = '123456' // Synthetic fixture only; generated codes never appear in assertions.
  const wrong = '000000' // randomInt never issues this code.
  const newPassword = 'NewP@ssword2'

  const verify = (otp = code) => service.verifyEmail({ email: user.email, otp })
  const reset = (otp = code, email = user.email) =>
    service.resetPassword({ email, otp, newPassword })
  const age = (milliseconds: number) => {
    store.record!.issuedAt = new Date(Date.now() - milliseconds)
  }

  beforeEach(async () => {
    secret = randomBytes(32).toString('hex')
    user = Object.assign(new User(), {
      id: 7, email: 'otp@example.com', firstName: 'Test', lastName: 'User',
      password: 'old-password-hash', isVerified: false,
      status: UserStatus.ACTIVE, role: SystemRole.USER,
    })
    users = {
      findOne: jest.fn(async ({ where }: { where: { email: string } }) =>
        where.email === user.email ? { ...user } : null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: user.id })),
    }
    refresh = {
      create: jest.fn((value) => value), save: jest.fn(async (value) => value),
      delete: jest.fn(async () => ({ affected: 1 })),
    }
    store = new OtpTestStore(() => user, refresh.delete)
    mailer = { sendOtp: jest.fn(async (_to: string, otp: string) => { delivered = otp }) }
    accessJwt = new JwtService({ secret: randomBytes(32).toString('hex') })
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(UserEmailOtp), useValue: store },
        { provide: getRepositoryToken(UserRefreshToken), useValue: refresh },
        { provide: getRepositoryToken(OAuthAccount), useValue: {} },
        { provide: 'ACCESS_JWT_SERVICE', useValue: accessJwt },
        { provide: 'REFRESH_JWT_SERVICE', useValue: new JwtService({
          secret: randomBytes(32).toString('hex'), signOptions: { expiresIn: '7d' },
        }) },
        { provide: ConfigService, useValue: new ConfigService({ OTP_HASH_SECRET: secret }) },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  afterEach(() => jest.restoreAllMocks())

  it('stores only the scoped HMAC, issues a six-digit code, and expires in ten minutes', async () => {
    const result = await service.resendVerification(user.email)
    const row = store.record!
    expect(/^\d{6}$/.test(delivered)).toBe(true)
    expect(row.otpHash.length).toBe(64)
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(['domrov-otp-v1', user.id, OtpPurpose.VERIFICATION, delivered])).digest('hex')
    expect(row.otpHash === expected).toBe(true)
    expect(row.expiresAt.getTime() - row.issuedAt.getTime()).toBe(600_000)
    expect(row.failedAttempts).toBe(0)
    expect(Object.keys(row)).not.toContain('otp')
    expect(JSON.stringify(row).includes(delivered)).toBe(false)
    expect(Object.keys(result)).toEqual(['message'])
    expect(store.findOne.mock.calls[0][0]).toBe(User)
    await expect(verify(delivered)).resolves.toHaveProperty('accessToken')
    expect(user.isVerified).toBe(true)
    expect(refresh.save).toHaveBeenCalledTimes(1)
  })

  it('accepts the correct code after four failures and preserves one-time use', async () => {
    store.seed(secret, code)
    for (let i = 0; i < 4; i++)
      await expect(verify(wrong)).rejects.toThrow('Invalid or expired verification code')
    expect(store.record!.failedAttempts).toBe(4)
    await verify()
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
    expect(refresh.save).toHaveBeenCalledTimes(1)
  })

  it.each([0, -1, -60_000])('rejects expired OTPs at server time offset %s', async (offset) => {
    store.seed(secret, code)
    store.record!.expiresAt = new Date(Date.now() + offset)
    await expect(verify()).rejects.toThrow('Invalid or expired verification code')
    expect(user.isVerified).toBe(false)
    expect(refresh.save).not.toHaveBeenCalled()
  })

  it('commits all five failed attempts and rejects the correct code afterward', async () => {
    store.seed(secret, code)
    for (let i = 1; i <= 5; i++) {
      await expect(verify(wrong)).rejects.toBeInstanceOf(BadRequestException)
      expect(store.record!.failedAttempts).toBe(i)
    }
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
    await expect(verify(wrong)).rejects.toBeInstanceOf(BadRequestException)
    expect(store.record!.failedAttempts).toBe(5)
    expect(store.record!.expiresAt.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('serializes concurrent failures without lost increments or more than five attempts', async () => {
    store.seed(secret, code)
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => verify(wrong)))
    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(store.record!.failedAttempts).toBe(5)
    expect(store.save).toHaveBeenCalledTimes(5)
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
  })

  it('allows only one concurrent correct verification and one refresh session', async () => {
    store.seed(secret, code)
    const results = await Promise.allSettled([verify(), verify(), verify()])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(refresh.save).toHaveBeenCalledTimes(1)
  })

  it('rejects a correct request queued behind the fifth incorrect request', async () => {
    store.seed(secret, code)
    store.record!.failedAttempts = 4
    const results = await Promise.allSettled([verify(wrong), verify()])
    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(store.record!.failedAttempts).toBe(5)
  })

  it('keeps the digest, issuance time, and attempts unchanged during cooldown', async () => {
    store.seed(secret, code)
    await expect(verify(wrong)).rejects.toBeInstanceOf(BadRequestException)
    const before = { ...store.record! }
    await expect(service.resendVerification(user.email)).rejects.toThrow('Please wait 60 seconds')
    expect(store.record!.otpHash === before.otpHash).toBe(true)
    expect(store.record!.issuedAt).toEqual(before.issuedAt)
    expect(store.record!.failedAttempts).toBe(1)
    expect(mailer.sendOtp).not.toHaveBeenCalled()
    age(60_000)
    await service.resendVerification(user.email)
    expect(store.record!.failedAttempts).toBe(0)
    expect(mailer.sendOtp).toHaveBeenCalledTimes(1)
  })

  it('serializes concurrent first issuance and resends so only one mail is sent', async () => {
    for (const existing of [false, true]) {
      if (existing) age(60_000)
      const results = await Promise.allSettled([
        service.resendVerification(user.email), service.resendVerification(user.email),
      ])
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    }
    expect(mailer.sendOtp).toHaveBeenCalledTimes(2)
  })

  it('retains cooldown after five failures, expiry, and password-reset consumption', async () => {
    for (const consumed of [false, true]) {
      store.seed(secret, code, OtpPurpose.PASSWORD_RESET)
      if (consumed) await reset()
      else for (let i = 0; i < 5; i++) await expect(reset(wrong)).rejects.toBeInstanceOf(BadRequestException)
      await service.requestPasswordReset({ email: user.email })
      expect(mailer.sendOtp).not.toHaveBeenCalled()
    }
  })

  it.each([OtpPurpose.VERIFICATION, OtpPurpose.PASSWORD_RESET])('isolates %s codes from the other purpose', async (purpose) => {
    store.seed(secret, code, purpose)
    const otherEndpoint = purpose === OtpPurpose.VERIFICATION ? reset : verify
    await expect(otherEndpoint()).rejects.toBeInstanceOf(BadRequestException)
    expect(store.record!.failedAttempts).toBe(0)
    expect(user.isVerified).toBe(false)
    expect(user.password).toBe('old-password-hash')
  })

  it.each(['purpose', 'user', 'secret'])('binds the HMAC to %s even if a digest is copied', async (scope) => {
    store.seed(secret, code)
    if (scope === 'purpose') store.record!.purpose = OtpPurpose.PASSWORD_RESET
    if (scope === 'user') {
      user.id += 1
      store.record!.userId = user.id
    }
    if (scope === 'secret') store.seed(randomBytes(32).toString('hex'), code)
    await expect(scope === 'purpose' ? reset() : verify()).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects malformed stored digests safely', async () => {
    store.seed(secret, code)
    store.record!.otpHash = 'invalid'
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
    expect(store.record!.failedAttempts).toBe(1)
  })

  it('replaces the old purpose after cooldown and invalidates the old code', async () => {
    store.seed(secret, code)
    age(60_000)
    await service.requestPasswordReset({ email: user.email })
    expect(store.record!.purpose).toBe(OtpPurpose.PASSWORD_RESET)
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
    await expect(reset(delivered)).resolves.toEqual({ message: 'Password reset successfully' })
    expect(await bcrypt.compare(newPassword, user.password)).toBe(true)
    expect(refresh.delete).toHaveBeenCalledWith({ userId: user.id })
    await expect(reset(delivered)).rejects.toThrow('Invalid or expired password reset code')
  })

  it('allows only one concurrent password reset and revokes sessions once', async () => {
    store.seed(secret, code, OtpPurpose.PASSWORD_RESET)
    const results = await Promise.allSettled([reset(), reset()])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(refresh.delete).toHaveBeenCalledTimes(1)
  })

  it('returns the same reset-request response for unknown, known, cooldown, and SMTP failure', async () => {
    const unknown = await service.requestPasswordReset({ email: 'unknown@example.com' })
    expect(await service.requestPasswordReset({ email: user.email })).toEqual(unknown)
    expect(await service.requestPasswordReset({ email: user.email })).toEqual(unknown)
    expect(mailer.sendOtp).toHaveBeenCalledTimes(1)
    age(60_000)
    const previous = store.record!.otpHash
    mailer.sendOtp.mockRejectedValueOnce(new InternalServerErrorException('Email delivery failed'))
    expect(await service.requestPasswordReset({ email: user.email })).toEqual(unknown)
    expect(store.record!.otpHash === previous).toBe(true)
    const knownError = await reset(wrong).catch((error: BadRequestException) => error.getResponse())
    const unknownError = await reset(wrong, 'unknown@example.com').catch((error: BadRequestException) => error.getResponse())
    expect(unknownError).toEqual(knownError)
  })

  it('rolls back failed verification-email delivery, including registration and resend state', async () => {
    mailer.sendOtp.mockRejectedValue(new InternalServerErrorException('Email delivery failed'))
    await expect(service.resendVerification(user.email)).rejects.toThrow('Email delivery failed')
    expect(store.record).toBeNull()
    store.seed(secret, code)
    age(60_000)
    store.record!.failedAttempts = 3
    const before = { ...store.record! }
    await expect(service.resendVerification(user.email)).rejects.toThrow('Email delivery failed')
    expect(store.record!.otpHash === before.otpHash).toBe(true)
    expect(store.record!.issuedAt).toEqual(before.issuedAt)
    expect(store.record!.failedAttempts).toBe(3)
    users.findOne.mockResolvedValueOnce(null)
    await expect(service.register({
      email: user.email, firstName: 'Test', lastName: 'User',
      password: newPassword, confirmPassword: newPassword,
      dob: '2000-01-01T00:00:00.000Z', phoneNumber: '0123456789',
    })).rejects.toThrow('Email delivery failed')
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({
      dob: new Date('2000-01-01T00:00:00.000Z'), phoneNumber: '0123456789',
    }))
  })

  it('rolls back consumption if the account update fails, permitting retry', async () => {
    store.seed(secret, code)
    const save = store.save.getMockImplementation()!
    store.save.mockImplementation(async (target, value) => {
      if (target === User) throw new Error('Account update failed')
      return save(target, value)
    })
    await expect(verify()).rejects.toThrow('Account update failed')
    expect(store.record!.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(user.isVerified).toBe(false)
    store.save.mockImplementation(save)
    await expect(verify()).resolves.toHaveProperty('accessToken')
  })

  it('does not issue tokens when OTP verification loses the race or signing fails', async () => {
    store.seed(secret, code)
    jest.spyOn(accessJwt, 'signAsync').mockRejectedValueOnce(new Error('Signing unavailable'))
    await expect(verify()).rejects.toThrow('Signing unavailable')
    expect(user.isVerified).toBe(true)
    await expect(verify()).rejects.toBeInstanceOf(BadRequestException)
    expect(refresh.save).not.toHaveBeenCalled()
  })
})

describe('OTP startup configuration', () => {
  it.each([undefined, '', 'short'])('fails startup for missing or undersized configuration (%s)', (value) => {
    const config = { OTP_HASH_SECRET: value, NODE_ENV: 'production' }
    expect(() => validateOtpConfiguration(config)).toThrow('OTP_HASH_SECRET must be configured')
  })

  it.each(['a'.repeat(64), 'change-me-development-placeholder-secret'])('rejects weak production placeholders', (value) => {
    expect(() => otpHashSecret(new ConfigService({
      OTP_HASH_SECRET: value, NODE_ENV: 'production',
    }))).toThrow('too weak for production')
  })

  it.each(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'])('rejects reuse of %s', (key) => {
    const secret = randomBytes(32).toString('hex')
    expect(() => otpHashSecret(new ConfigService({
      OTP_HASH_SECRET: secret, [key]: secret,
    }))).toThrow('independent of JWT secrets')
  })

  it('accepts an independently generated production key', () => {
    const values = { OTP_HASH_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'production' }
    expect(validateOtpConfiguration(values) === values).toBe(true)
  })
})
