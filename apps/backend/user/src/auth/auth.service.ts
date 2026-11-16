import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto'
import { EntityManager, MoreThan, Repository } from 'typeorm'
import { otpHashSecret } from './otp.config'
import {
  ChangePasswordRequest,
  CompletePasswordResetRequest,
  LoginRequest,
  PasswordResetRequest,
  RegisterRequest,
  UpdateProfileRequest,
  VerifyEmailRequest,
} from './auth.dto'
import { OtpPurpose, UserEmailOtp } from '../entities/user-email-otp.entity'
import { SystemRole, User, UserStatus } from '../entities/user.entity'
import { UserRefreshToken } from '../entities/user-refresh-token.entity'
import { MailerService } from '../mailer/mailer.service'
import { OAuthAccount } from '../entities/oauth-account.entity'
import { AuthEventsPublisher } from '../messaging/rabbitmq'

export interface AuthUser {
  sub: number
  email: string
  role: SystemRole
}

interface RefreshClaims extends AuthUser {
  jti: string
  exp: number
}

@Injectable()
export class AuthService {
  private readonly otpSecret: string

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserRefreshToken)
    private readonly refreshTokens: Repository<UserRefreshToken>,
    @InjectRepository(UserEmailOtp)
    private readonly otps: Repository<UserEmailOtp>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccounts: Repository<OAuthAccount>,
    @Inject('ACCESS_JWT_SERVICE') private readonly accessJwt: JwtService,
    @Inject('REFRESH_JWT_SERVICE') private readonly refreshJwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    @Optional() private readonly events?: AuthEventsPublisher,
  ) {
    this.otpSecret = otpHashSecret(config)
  }

  async register(input: RegisterRequest) {
    if (input.password !== input.confirmPassword)
      throw new BadRequestException('Password does not match')
    this.validatePassword(input.password)
    const email = input.email.toLowerCase()
    if (await this.users.findOne({ where: { email } }))
      throw new ConflictException('Email already registered')

    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      password: await bcrypt.hash(input.password, 10),
      gender: input.gender,
      dob: input.dob ? new Date(input.dob) : undefined,
      phoneNumber: input.phoneNumber,
      profilePictureUrl: input.profilePictureUrl,
      status: UserStatus.ACTIVE,
      role: SystemRole.USER,
      isVerified: false,
      isTwoFactorEnable: false,
    })
    const saved = await this.users.save(user)
    void this.events?.publish(
      'user.created',
      { userId: saved.id, email: saved.email, role: saved.role },
      String(saved.id),
    )
    await this.sendOtp(saved, OtpPurpose.VERIFICATION)
    return {
      userId: saved.id,
      firstName: saved.firstName,
      lastName: saved.lastName,
      email: saved.email,
    }
  }

  async login(input: LoginRequest) {
    const user = await this.users.findOne({
      where: { email: input.email.toLowerCase() },
    })
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('Invalid credentials')
    if (!user.isVerified)
      throw new BadRequestException('User account is not verified')
    if (!(await bcrypt.compare(input.password, user.password)))
      throw new UnauthorizedException('Invalid credentials')
    return this.issueTokens(user)
  }

  async refresh(refreshToken: string) {
    let payload: RefreshClaims
    try {
      payload = await this.refreshJwt.verifyAsync<RefreshClaims>(refreshToken)
      if (
        !payload ||
        !Number.isSafeInteger(payload.sub) ||
        payload.sub <= 0 ||
        typeof payload.jti !== 'string' ||
        !payload.jti ||
        !Number.isSafeInteger(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000)
      )
        throw new Error('Invalid refresh claims')
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }
    const tokenHash = this.hashRefreshToken(refreshToken)
    const session = await this.refreshTokens.findOne({
      where: { userId: payload.sub, tokenHash },
      relations: { user: true },
    })
    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.user ||
      session.user.id !== payload.sub ||
      session.user.status !== UserStatus.ACTIVE
    )
      throw new UnauthorizedException('Refresh token is invalid or expired')
    const {
      accessToken,
      refreshToken: nextToken,
      expiresAt,
    } = await this.createTokenPair(session.user)
    // Compare and replace in one SQL statement. A concurrent rotation or logout
    // removes the matching hash, so only the winning request can return tokens.
    const result = await this.refreshTokens.update(
      {
        id: session.id,
        userId: payload.sub,
        tokenHash,
        expiresAt: MoreThan(new Date()),
      },
      { tokenHash: this.hashRefreshToken(nextToken), expiresAt },
    )
    if (result.affected !== 1)
      throw new UnauthorizedException('Refresh token is invalid or expired')
    return {
      accessToken,
      refreshToken: nextToken,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h'),
    }
  }

  async oauthAuthorizationUrl(provider: string) {
    const normalized = provider.toLowerCase()
    const config = this.oauthConfig(normalized)
    if (!config)
      throw new ServiceUnavailableException(
        `OAuth provider ${provider} is not configured`,
      )
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: config.scope,
      state: normalized,
    })
    return `${config.authorizationUrl}?${params.toString()}`
  }

  async oauthCallback(provider: string, code: string) {
    const normalized = provider.toLowerCase()
    const config = this.oauthConfig(normalized)
    if (!config)
      throw new ServiceUnavailableException(
        `OAuth provider ${provider} is not configured`,
      )
    if (!code)
      throw new UnauthorizedException('OAuth authorization code is required')
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.callbackUrl,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok)
      throw new UnauthorizedException('OAuth token exchange failed')
    const token = (await tokenResponse.json()) as { access_token?: string }
    if (!token.access_token)
      throw new UnauthorizedException(
        'OAuth provider did not return an access token',
      )
    const profileResponse = await fetch(config.profileUrl, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json',
      },
    })
    if (!profileResponse.ok)
      throw new UnauthorizedException('OAuth profile request failed')
    type OAuthProviderProfile = {
      sub?: string
      id?: string | number
      email?: string
      given_name?: string
      family_name?: string
      picture?: string
      name?: string
      login?: string
      avatar_url?: string
    }
    const profile = (await profileResponse.json()) as OAuthProviderProfile
    const normalizedProfile =
      normalized === 'google'
        ? {
            id: profile.sub,
            email: profile.email,
            firstName: profile.given_name,
            lastName: profile.family_name,
            avatar: profile.picture,
          }
        : {
            id: String(profile.id),
            email: profile.email,
            firstName: profile.name?.split(' ')[0] ?? profile.login,
            lastName: profile.name?.split(' ').slice(1).join(' ') ?? '',
            avatar: profile.avatar_url,
          }
    if (!normalizedProfile.id || !normalizedProfile.email)
      throw new UnauthorizedException(
        'OAuth provider returned an incomplete profile',
      )

    const account = await this.oauthAccounts.findOne({
      where: { provider: normalized, accountId: normalizedProfile.id },
      relations: { user: true },
    })
    let user = account?.user
    if (!user) {
      user =
        (await this.users.findOne({
          where: { email: normalizedProfile.email.toLowerCase() },
        })) ?? undefined
      if (!user)
        user = await this.users.save(
          this.users.create({
            firstName: normalizedProfile.firstName || 'OAuth',
            lastName: normalizedProfile.lastName || 'User',
            email: normalizedProfile.email.toLowerCase(),
            password: await bcrypt.hash(
              `oauth:${normalized}:${normalizedProfile.id}:${Date.now()}`,
              10,
            ),
            profilePictureUrl: normalizedProfile.avatar,
            status: UserStatus.ACTIVE,
            role: SystemRole.USER,
            isVerified: true,
            isTwoFactorEnable: false,
          }),
        )
      await this.oauthAccounts.save(
        this.oauthAccounts.create({
          provider: normalized,
          accountId: normalizedProfile.id,
          user,
          userId: user.id,
        }),
      )
    }
    return this.issueTokens(user)
  }

  async logout(userId: number, refreshToken: string) {
    const result = await this.refreshTokens.delete({
      userId,
      tokenHash: this.hashRefreshToken(refreshToken),
    })
    if (!result.affected)
      throw new NotFoundException('Session not found or already expired')
  }

  async currentUser(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
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
    }
  }

  async updateProfile(userId: number, input: UpdateProfileRequest) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    if (input.phoneNumber && input.phoneNumber !== user.phoneNumber) {
      const existing = await this.users.findOne({
        where: { phoneNumber: input.phoneNumber },
      })
      if (existing && existing.id !== userId)
        throw new BadRequestException('Phone number already in use')
    }
    Object.assign(user, input)
    await this.users.save(user)
    return {
      message: 'Profile updated successfully',
      user: await this.currentUser(userId),
    }
  }

  async changePassword(userId: number, input: ChangePasswordRequest) {
    if (input.newPassword !== input.confirmPassword)
      throw new BadRequestException(
        'New password and confirmation do not match',
      )
    this.validatePassword(input.newPassword)
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    if (!(await bcrypt.compare(input.currentPassword, user.password)))
      throw new UnauthorizedException('Current password is incorrect')
    if (await bcrypt.compare(input.newPassword, user.password))
      throw new BadRequestException(
        'New password must be different from current password',
      )
    user.password = await bcrypt.hash(input.newPassword, 10)
    await this.users.save(user)
    await this.refreshTokens.delete({ userId })
    return { message: 'Password changed successfully' }
  }

  async resendVerification(email: string) {
    const user = await this.findUserByEmail(email)
    if (user.isVerified)
      throw new BadRequestException('Email is already verified')
    await this.sendOtp(user, OtpPurpose.VERIFICATION)
    return { message: 'Verification OTP sent successfully' }
  }

  async verifyEmail(input: VerifyEmailRequest) {
    const user = await this.findUserByEmail(input.email)
    if (user.isVerified)
      throw new BadRequestException('Email is already verified')
    const verified = await this.consumeOtp(
      user.id,
      OtpPurpose.VERIFICATION,
      input.otp,
      async (manager, lockedUser) => {
        if (lockedUser.isVerified)
          throw new BadRequestException('Email is already verified')
        lockedUser.isVerified = true
        await manager.save(User, lockedUser)
      },
    )
    if (!verified)
      throw new BadRequestException('Invalid or expired verification code')
    return this.issueTokens(verified)
  }

  async requestPasswordReset(input: PasswordResetRequest) {
    const user = await this.users.findOne({
      where: { email: input.email.toLowerCase() },
    })
    if (user) {
      try {
        // Cooldown and SMTP failure must not disclose account existence.
        await this.sendOtp(user, OtpPurpose.PASSWORD_RESET)
      } catch (error) {
        if (
          !(error instanceof BadRequestException) &&
          !(error instanceof InternalServerErrorException)
        )
          throw error
      }
    }
    return { message: 'If the email exists, a password reset code was sent.' }
  }

  async resetPassword(input: CompletePasswordResetRequest) {
    this.validatePassword(input.newPassword)
    const user = await this.users.findOne({
      where: { email: input.email.toLowerCase() },
    })
    // Do the same password work for known and unknown accounts.
    const password = await bcrypt.hash(input.newPassword, 10)
    const reset =
      user &&
      (await this.consumeOtp(
        user.id,
        OtpPurpose.PASSWORD_RESET,
        input.otp,
        async (manager, lockedUser) => {
          lockedUser.password = password
          await manager.save(User, lockedUser)
          await manager.delete(UserRefreshToken, { userId: lockedUser.id })
        },
      ))
    if (!reset)
      throw new BadRequestException('Invalid or expired password reset code')
    return { message: 'Password reset successfully' }
  }

  private async issueTokens(user: User) {
    const { accessToken, refreshToken, expiresAt } =
      await this.createTokenPair(user)
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
      }),
    )
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h'),
    }
  }

  private async createTokenPair(user: User) {
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('User account is not active')
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    const accessToken = await this.accessJwt.signAsync(payload)
    const refreshToken = await this.refreshJwt.signAsync({
      ...payload,
      jti: randomUUID(),
    })
    const claims = this.refreshJwt.decode<RefreshClaims>(refreshToken)
    if (!claims || !Number.isSafeInteger(claims.exp))
      throw new Error('Refresh JWT must contain an expiration claim')
    const expiresAt = new Date(claims.exp * 1000)
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())
      throw new Error('Refresh JWT must have a future expiration')
    return { accessToken, refreshToken, expiresAt }
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private async sendOtp(user: User, purpose: OtpPurpose) {
    await this.otps.manager.transaction(async (manager) => {
      // Lock the parent even when no OTP exists: serializes first issuance,
      // resends, and consumption across all service instances.
      const lockedUser = await manager.findOne(User, {
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!lockedUser) throw new BadRequestException('Invalid or expired code')
      if (purpose === OtpPurpose.VERIFICATION && lockedUser.isVerified)
        throw new BadRequestException('Email is already verified')
      const existing = await manager.findOne(UserEmailOtp, {
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      })
      const now = new Date()
      if (existing && now.getTime() - existing.issuedAt.getTime() < 60_000)
        throw new BadRequestException(
          'Please wait 60 seconds before requesting another code',
        )
      const otp = randomInt(100000, 1000000).toString()
      const record = manager.create(UserEmailOtp, {
        ...(existing ? { id: existing.id } : {}),
        userId: user.id,
        otpHash: this.hashOtp(user.id, purpose, otp),
        purpose,
        failedAttempts: 0,
        issuedAt: now,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      })
      await manager.save(UserEmailOtp, record)
      // A failed SMTP operation rolls back issuance, including its cooldown.
      await this.mailer.sendOtp(user.email, otp, purpose)
    })
  }

  private hashOtp(userId: number, purpose: OtpPurpose, code: string) {
    return createHmac('sha256', this.otpSecret)
      .update(JSON.stringify(['domrov-otp-v1', userId, purpose, code]))
      .digest('hex')
  }

  private async consumeOtp(
    userId: number,
    purpose: OtpPurpose,
    code: string,
    apply: (manager: EntityManager, user: User) => Promise<void>,
  ): Promise<User | null> {
    return this.otps.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      })
      const record = await manager.findOne(UserEmailOtp, {
        where: { userId, purpose },
        lock: { mode: 'pessimistic_write' },
      })
      const now = new Date()
      if (
        !user ||
        !record ||
        record.expiresAt <= now ||
        record.failedAttempts >= 5
      )
        return null
      const candidate = Buffer.from(this.hashOtp(userId, purpose, code), 'hex')
      const matches =
        /^[a-f0-9]{64}$/.test(record.otpHash) &&
        timingSafeEqual(Buffer.from(record.otpHash, 'hex'), candidate)
      if (!matches) {
        record.failedAttempts += 1
        if (record.failedAttempts >= 5) record.expiresAt = now
        await manager.save(UserEmailOtp, record)
        // Return, then throw outside the transaction so the counter commits.
        return null
      }
      record.expiresAt = now
      await manager.save(UserEmailOtp, record)
      await apply(manager, user)
      // Retain issuedAt even after consumption to enforce the resend cooldown.
      return user
    })
  }

  private async findUserByEmail(email: string) {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase() },
    })
    if (!user) throw new BadRequestException('Invalid or expired code')
    return user
  }

  private validatePassword(password: string) {
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)
    ) {
      throw new BadRequestException(
        'Password must be at least 8 characters and contain uppercase, number, and special character',
      )
    }
  }

  private oauthConfig(provider: string) {
    if (provider !== 'google' && provider !== 'github') return undefined
    const prefix = provider === 'google' ? 'GOOGLE' : 'GITHUB'
    const legacyPrefix = provider === 'github' ? 'GIT_HUB' : prefix
    const clientId =
      this.config.get<string>(`${prefix}_CLIENT_ID`) ??
      this.config.get<string>(`${legacyPrefix}_CLIENT_ID`)
    const clientSecret =
      this.config.get<string>(`${prefix}_CLIENT_SECRET`) ??
      this.config.get<string>(`${legacyPrefix}_CLIENT_SECRET`)
    const callbackUrl =
      this.config.get<string>(`${prefix}_CALLBACK_URL`) ??
      this.config.get<string>(`${legacyPrefix}_CALLBACK_URL`)
    if (!clientId || !clientSecret || !callbackUrl) return undefined
    return provider === 'google'
      ? {
          clientId,
          clientSecret,
          callbackUrl,
          scope: 'openid email profile',
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        }
      : {
          clientId,
          clientSecret,
          callbackUrl,
          scope: 'read:user user:email',
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          profileUrl: 'https://api.github.com/user',
        }
  }
}
