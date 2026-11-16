import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import { createHash, randomBytes, randomUUID } from 'crypto'
import request from 'supertest'
import { FindOneOptions, FindOperator, UpdateResult } from 'typeorm'
import { AuthController } from '../src/auth/auth.controller'
import { AuthService } from '../src/auth/auth.service'
import { OAuthAccount } from '../src/entities/oauth-account.entity'
import { OtpPurpose, UserEmailOtp } from '../src/entities/user-email-otp.entity'
import { UserRefreshToken } from '../src/entities/user-refresh-token.entity'
import { SystemRole, User, UserStatus } from '../src/entities/user.entity'
import { MailerService } from '../src/mailer/mailer.service'
import { OtpTestStore } from './support/otp-store'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const password = 'TestP@ssword1'
type RefreshClaims = { sub: number; jti: string; exp: number; iat: number }
type RotationCriteria = {
  id: number
  userId: number
  tokenHash: string
  expiresAt: FindOperator<Date>
}

describe('Refresh sessions with real JWT signing and conditional persistence', () => {
  let service: AuthService
  let app: INestApplication
  let refreshJwt: JwtService
  let refreshSecret: string
  let accessJwt: JwtService
  let user: User
  let passwordHash: string
  let sessions: Map<number, UserRefreshToken>
  let refreshTokens: ReturnType<typeof createSessionRepository>
  let otps: OtpTestStore
  let otpSecret: string
  let oauthAccounts: { findOne: jest.Mock }
  let config: ConfigService

  // This adapter models a single conditional UPDATE, not a PostgreSQL server.
  function createSessionRepository() {
    return {
      create: jest.fn((input: Partial<UserRefreshToken>) =>
        Object.assign(new UserRefreshToken(), input),
      ),
      save: jest.fn(async (input: UserRefreshToken) => {
        const saved = { ...input, id: sessions.size + 1, user }
        sessions.set(saved.id, saved)
        return saved
      }),
      findOne: jest.fn(async ({ where }: FindOneOptions<UserRefreshToken>) => {
        if (!where || Array.isArray(where))
          throw new Error('Expected session criteria')
        const session = [...sessions.values()].find(
          (row) =>
            row.userId === where.userId && row.tokenHash === where.tokenHash,
        )
        // Return a snapshot, as separate SELECTs would do.
        return session ? { ...session } : null
      }),
      update: jest.fn(
        async (
          criteria: RotationCriteria,
          replacement: Pick<UserRefreshToken, 'tokenHash' | 'expiresAt'>,
        ): Promise<UpdateResult> => {
          const row = sessions.get(criteria.id)
          if (
            !row ||
            row.userId !== criteria.userId ||
            row.tokenHash !== criteria.tokenHash ||
            row.expiresAt <= criteria.expiresAt.value
          )
            return { affected: 0, raw: [], generatedMaps: [] }
          sessions.set(row.id, { ...row, ...replacement })
          return { affected: 1, raw: [], generatedMaps: [] }
        },
      ),
      delete: jest.fn(
        async (criteria: { userId: number; tokenHash?: string }) => {
          let affected = 0
          for (const [id, row] of sessions) {
            if (
              row.userId === criteria.userId &&
              (!criteria.tokenHash || row.tokenHash === criteria.tokenHash)
            ) {
              sessions.delete(id)
              affected++
            }
          }
          return { affected, raw: [] }
        },
      ),
    }
  }

  const login = () => service.login({ email: user.email, password })
  const sessionFor = (token: string) =>
    [...sessions.values()].find((row) => row.tokenHash === hash(token))

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4)
  })

  beforeEach(async () => {
    user = Object.assign(new User(), {
      id: 7,
      email: 'refresh@example.com',
      password: passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: SystemRole.USER,
      status: UserStatus.ACTIVE,
      isVerified: true,
    })
    sessions = new Map()
    refreshTokens = createSessionRepository()
    // Ephemeral, test-only secrets; never printed or read from the environment.
    const accessSecret = randomUUID()
    accessJwt = new JwtService({
      secret: accessSecret,
      signOptions: { expiresIn: '20m' },
    })
    refreshSecret = randomUUID()
    refreshJwt = new JwtService({
      secret: refreshSecret,
      signOptions: { expiresIn: '2h' },
    })
    otpSecret = randomBytes(32).toString('hex')
    config = new ConfigService({
      OTP_HASH_SECRET: otpSecret,
      JWT_ACCESS_SECRET: accessSecret,
      JWT_ACCESS_EXPIRES_IN: '20m',
    })
    otps = new OtpTestStore(() => user, refreshTokens.delete)
    oauthAccounts = { findOne: jest.fn() }
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(async () => user),
            save: jest.fn(async (value: User) => value),
          },
        },
        {
          provide: getRepositoryToken(UserRefreshToken),
          useValue: refreshTokens,
        },
        { provide: getRepositoryToken(UserEmailOtp), useValue: otps },
        { provide: getRepositoryToken(OAuthAccount), useValue: oauthAccounts },
        { provide: 'ACCESS_JWT_SERVICE', useValue: accessJwt },
        { provide: 'REFRESH_JWT_SERVICE', useValue: refreshJwt },
        { provide: ConfigService, useValue: config },
        { provide: MailerService, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile()
    service = module.get(AuthService)
    app = module.createNestApplication({ logger: false })
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    await app.init()
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await app?.close()
  })

  it('issues unique tokens in the same second and persists only hashes with JWT expiry', async () => {
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)
    const first = await login()
    const second = await login()
    const firstClaims = refreshJwt.decode<RefreshClaims>(first.refreshToken)
    const secondClaims = refreshJwt.decode<RefreshClaims>(second.refreshToken)
    expect(firstClaims.iat === secondClaims.iat).toBe(true)
    expect(first.refreshToken === second.refreshToken).toBe(false)
    expect(firstClaims.jti === secondClaims.jti).toBe(false)
    expect(firstClaims.jti).toMatch(/^[0-9a-f-]{36}$/)
    expect(sessions.size).toBe(2)
    const stored = sessionFor(first.refreshToken)!
    expect(stored.tokenHash === hash(first.refreshToken)).toBe(true)
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.expiresAt.getTime()).toBe(firstClaims.exp * 1000)
    for (const [input] of refreshTokens.create.mock.calls) {
      expect(input).not.toHaveProperty('refreshToken')
      expect(JSON.stringify(input).includes(first.refreshToken)).toBe(false)
      expect(JSON.stringify(input).includes(second.refreshToken)).toBe(false)
    }
  })

  it('rotates one session, rejects reuse, and preserves another device session', async () => {
    const first = await login()
    const otherDevice = await login()
    const oldSession = sessionFor(first.refreshToken)!
    const rotated = await service.refresh(first.refreshToken)
    expect(rotated.refreshToken === first.refreshToken).toBe(false)
    expect(sessionFor(first.refreshToken)).toBeUndefined()
    expect(sessionFor(rotated.refreshToken)?.id).toBe(oldSession.id)
    expect(sessionFor(otherDevice.refreshToken)).toBeDefined()
    expect(sessions.size).toBe(2)
    expect(sessionFor(rotated.refreshToken)?.expiresAt.getTime()).toBe(
      refreshJwt.decode<RefreshClaims>(rotated.refreshToken).exp * 1000,
    )
    expect(refreshTokens.update).toHaveBeenCalledWith(
      {
        id: oldSession.id,
        userId: user.id,
        tokenHash: hash(first.refreshToken),
        expiresAt: expect.objectContaining({ _type: 'moreThan' }),
      },
      { tokenHash: hash(rotated.refreshToken), expiresAt: expect.any(Date) },
    )
    expect(refreshTokens.save).toHaveBeenCalledTimes(2)
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    await expect(service.refresh(rotated.refreshToken)).resolves.toHaveProperty(
      'accessToken',
    )
    await expect(
      service.refresh(otherDevice.refreshToken),
    ).resolves.toHaveProperty('accessToken')
  })

  it('allows only one concurrent rotation even when both requests select the old session', async () => {
    const initial = await login()
    const results = await Promise.allSettled([
      service.refresh(initial.refreshToken),
      service.refresh(initial.refreshToken),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const failed = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult
    expect(failed.reason).toBeInstanceOf(UnauthorizedException)
    expect(refreshTokens.update).toHaveBeenCalledTimes(2)
    for (const lookup of refreshTokens.findOne.mock.results) {
      expect(await lookup.value).not.toBeNull()
    }
    expect(sessions.size).toBe(1)
    expect(sessionFor(initial.refreshToken)).toBeUndefined()
  })

  it.each([0, undefined, 2])(
    'requires exactly one affected row (received %s)',
    async (affected) => {
      const initial = await login()
      refreshTokens.update.mockResolvedValueOnce({
        affected,
        raw: [],
        generatedMaps: [],
      })
      await expect(
        service.refresh(initial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    },
  )

  it('does not recreate a session revoked between lookup and update', async () => {
    const initial = await login()
    const sign = accessJwt.signAsync.bind(accessJwt)
    jest
      .spyOn(accessJwt, 'signAsync')
      .mockImplementationOnce(async (payload) => {
        await service.logout(user.id, initial.refreshToken)
        return sign(payload)
      })
    await expect(service.refresh(initial.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(sessions.size).toBe(0)
  })

  it('rejects a session that expires between lookup and update', async () => {
    const initial = await login()
    const sign = accessJwt.signAsync.bind(accessJwt)
    jest
      .spyOn(accessJwt, 'signAsync')
      .mockImplementationOnce(async (payload) => {
        sessionFor(initial.refreshToken)!.expiresAt = new Date(
          Date.now() - 1000,
        )
        return sign(payload)
      })
    await expect(service.refresh(initial.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(refreshTokens.update).toHaveBeenCalledTimes(1)
  })

  it('keeps the current session usable if token signing fails before rotation', async () => {
    const initial = await login()
    jest
      .spyOn(refreshJwt, 'signAsync')
      .mockRejectedValueOnce(new Error('Signing unavailable'))
    await expect(service.refresh(initial.refreshToken)).rejects.toThrow(
      'Signing unavailable',
    )
    expect(refreshTokens.update).not.toHaveBeenCalled()
    expect(sessionFor(initial.refreshToken)).toBeDefined()
    await expect(service.refresh(initial.refreshToken)).resolves.toHaveProperty(
      'accessToken',
    )
  })

  it('revokes only the hash belonging to the authenticated user and device', async () => {
    const first = await login()
    const otherDevice = await login()
    await expect(
      service.logout(user.id + 1, first.refreshToken),
    ).rejects.toThrow('Session not found')
    expect(sessionFor(first.refreshToken)).toBeDefined()
    await service.logout(user.id, first.refreshToken)
    expect(refreshTokens.delete).toHaveBeenLastCalledWith({
      userId: user.id,
      tokenHash: hash(first.refreshToken),
    })
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    await expect(
      service.refresh(otherDevice.refreshToken),
    ).resolves.toHaveProperty('accessToken')
  })

  it('rejects an expired JWT before querying persistence', async () => {
    const expired = await refreshJwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      { expiresIn: -1 },
    )
    await expect(service.refresh(expired)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(refreshTokens.findOne).not.toHaveBeenCalled()
    expect(refreshTokens.update).not.toHaveBeenCalled()
  })

  it('rejects an expired stored session even if the JWT is valid', async () => {
    const initial = await login()
    sessionFor(initial.refreshToken)!.expiresAt = new Date(Date.now() - 1000)
    await expect(service.refresh(initial.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(refreshTokens.update).not.toHaveBeenCalled()
  })

  it.each([UserStatus.INACTIVE, UserStatus.BANNED])(
    'rejects %s users before issuing or rotating tokens',
    async (status) => {
      const initial = await login()
      user.status = status
      await expect(
        service.refresh(initial.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException)
      await expect(login()).rejects.toBeInstanceOf(UnauthorizedException)
      expect(refreshTokens.update).not.toHaveBeenCalled()
      expect(refreshTokens.save).toHaveBeenCalledTimes(1)
    },
  )

  it('rejects missing session users', async () => {
    const initial = await login()
    Object.assign(sessionFor(initial.refreshToken)!, { user: null })
    await expect(service.refresh(initial.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(refreshTokens.update).not.toHaveBeenCalled()
  })

  it('rejects malformed, invalidly signed, revoked, and missing-claim tokens', async () => {
    const tokens = [
      'not-a-jwt',
      await new JwtService({ secret: randomUUID() }).signAsync({
        sub: user.id,
        jti: randomUUID(),
      }),
      await refreshJwt.signAsync({ sub: user.id, jti: randomUUID() }),
      await refreshJwt.signAsync({ sub: user.id }),
      await refreshJwt.signAsync({ sub: '7', jti: randomUUID() }),
      await new JwtService({ secret: refreshSecret }).signAsync({
        sub: user.id,
        jti: randomUUID(),
      }),
    ]
    for (const token of tokens) {
      await expect(service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    }
    expect(refreshTokens.update).not.toHaveBeenCalled()
  })

  it('refuses to persist a refresh JWT signed without exp', async () => {
    const tokenWithoutExpiry = await new JwtService({
      secret: refreshSecret,
    }).signAsync({
      sub: user.id,
      jti: randomUUID(),
    })
    jest
      .spyOn(refreshJwt, 'signAsync')
      .mockResolvedValueOnce(tokenWithoutExpiry)
    await expect(login()).rejects.toThrow(
      'Refresh JWT must contain an expiration claim',
    )
    expect(refreshTokens.save).not.toHaveBeenCalled()
  })

  it('issues a unique hashed refresh session after email verification', async () => {
    const existing = await login()
    user.isVerified = false
    otps.seed(otpSecret, '123456', OtpPurpose.VERIFICATION)
    const verified = await service.verifyEmail({
      email: user.email,
      otp: '123456',
    })
    expect(verified.refreshToken === existing.refreshToken).toBe(false)
    expect(
      refreshJwt.decode<RefreshClaims>(verified.refreshToken).jti,
    ).toBeDefined()
    expect(sessionFor(verified.refreshToken)).toBeDefined()
  })

  it('issues unique hashed sessions for OAuth and rejects inactive OAuth users', async () => {
    const existing = await login()
    for (const key of [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CALLBACK_URL',
    ]) {
      config.set(key, 'test-only')
    }
    oauthAccounts.findOne.mockResolvedValue({ user })
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'test-provider-token',
            sub: 'provider-user',
            email: user.email,
          }),
          { status: 200 },
        ),
    )
    const first = await service.oauthCallback('google', 'test-code')
    const second = await service.oauthCallback('google', 'test-code')
    expect(first.refreshToken === existing.refreshToken).toBe(false)
    expect(first.refreshToken === second.refreshToken).toBe(false)
    expect(sessionFor(first.refreshToken)).toBeDefined()
    expect(
      refreshJwt.decode<RefreshClaims>(first.refreshToken).jti,
    ).toBeDefined()
    user.status = UserStatus.INACTIVE
    await expect(
      service.oauthCallback('google', 'test-code'),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(sessions.size).toBe(3)
  })

  describe('HTTP routes with real controller, guard, JWTs, and in-memory persistence', () => {
    const cookie = (response: request.Response) => {
      const values = response.headers['set-cookie'] as unknown as string[]
      expect(values?.length).toBe(1)
      const value = values[0]
      expect(value.includes('HttpOnly')).toBe(true)
      expect(value.includes('SameSite=Strict')).toBe(true)
      expect(value.includes('Max-Age=604800')).toBe(true)
      return value.split(';')[0]
    }

    it('preserves login and both refresh routes, rotates cookies, and returns 401 for reuse', async () => {
      const loggedIn = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password })
        .expect(200)
      const firstCookie = cookie(loggedIn)
      expect(loggedIn.body.success).toBe(true)
      expect(loggedIn.body.data).not.toHaveProperty('refreshToken')
      const refreshed = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookie)
        .send({})
        .expect(200)
      const secondCookie = cookie(refreshed)
      expect(secondCookie === firstCookie).toBe(false)
      expect(Object.keys(refreshed.body.data).sort()).toEqual([
        'accessToken',
        'expiresIn',
      ])
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookie)
        .send({})
        .expect(401)
      const legacy = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', secondCookie)
        .expect(200)
      expect(cookie(legacy) === secondCookie).toBe(false)
      expect(Object.keys(legacy.body.data).sort()).toEqual([
        'accessToken',
        'issuedAt',
        'status',
      ])
      expect(legacy.body.data.status).toBe('success')
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', secondCookie)
        .expect(401)
    })

    it('accepts the refresh body and logout header while clearing the cookie', async () => {
      const initial = await login()
      const refreshed = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: initial.refreshToken })
        .expect(200)
      const rotatedCookie = cookie(refreshed)
      const rotatedToken = decodeURIComponent(
        rotatedCookie.slice('refresh_token='.length),
      )
      const loggedOut = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)
        .set('x-refresh-token', rotatedToken)
        .expect(200)
      expect(loggedOut.body.data.message).toBe('Logged out from current device')
      expect(
        String(loggedOut.headers['set-cookie']).includes('refresh_token=;'),
      ).toBe(true)
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', rotatedCookie)
        .expect(401)
    })

    it('returns at most one successful HTTP response for concurrent reuse', async () => {
      const initial = await login()
      const results = await Promise.all([
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: initial.refreshToken }),
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: initial.refreshToken }),
      ])
      expect(results.map((result) => result.status).sort()).toEqual([200, 401])
      expect(
        results.filter((result) => result.headers['set-cookie']),
      ).toHaveLength(1)
    })

    it('accepts the logout cookie and preserves the verification cookie response', async () => {
      user.isVerified = false
      otps.seed(otpSecret, '123456', OtpPurpose.VERIFICATION)
      const verified = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: user.email, otp: '123456' })
        .expect(200)
      const verifiedCookie = cookie(verified)
      expect(verified.body.data.message).toBe('Email verified successfully')
      expect(verified.body.data).not.toHaveProperty('refreshToken')
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${verified.body.data.accessToken}`)
        .set('Cookie', verifiedCookie)
        .expect(200)
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', verifiedCookie)
        .expect(401)
    })

    it('returns HTTP 401 for expired, inactive, invalid, and missing refresh tokens', async () => {
      const initial = await login()
      const expired = await refreshJwt.signAsync(
        { sub: user.id, jti: randomUUID() },
        { expiresIn: -1 },
      )
      for (const refreshToken of [expired, 'not-a-jwt']) {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken })
          .expect(401)
      }
      user.status = UserStatus.INACTIVE
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: initial.refreshToken })
        .expect(401)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401)
      await request(app.getHttpServer()).post('/auth/refresh-token').expect(401)
    })
  })
})
