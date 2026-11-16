import { ConfigService } from '@nestjs/config'

// Configuration errors deliberately contain no supplied values.
export function otpHashSecret(config: ConfigService): string {
  const secret = config.get<string>('OTP_HASH_SECRET')
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || secret.trim() !== secret)
    throw new Error('OTP_HASH_SECRET must be configured with at least 32 random bytes')
  if (
    secret === config.get<string>('JWT_ACCESS_SECRET') ||
    secret === config.get<string>('JWT_REFRESH_SECRET')
  )
    throw new Error('OTP_HASH_SECRET must be independent of JWT secrets')
  if (
    config.get<string>('NODE_ENV') === 'production' &&
    (new Set(secret).size < 10 || /example|change.?me|placeholder|development|test.?only/i.test(secret))
  )
    throw new Error('OTP_HASH_SECRET is too weak for production')
  return secret
}

export function validateOtpConfiguration(values: Record<string, unknown>) {
  otpHashSecret(new ConfigService(values))
  return values
}
