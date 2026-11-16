import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { Transporter } from 'nodemailer'
import { OtpPurpose } from '../entities/user-email-otp.entity'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)
  private readonly transporter?: Transporter

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')

    if (host) {
      const port = Number(this.config.get('SMTP_PORT', 587))

      const user = this.config.get<string>('SMTP_USER')
      const pass =
        this.config.get<string>('SMTP_PASSWORD') ??
        this.config.get<string>('SMTP_PASS')

      if (Boolean(user) !== Boolean(pass)) {
        throw new Error(
          'SMTP username and password must be configured together',
        )
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        ...(user && pass ? { auth: { user, pass } } : {}),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      })
    }
  }

  async sendOtp(to: string, otp: string, purpose: OtpPurpose) {
    if (!this.transporter) {
      if (this.config.get('NODE_ENV') !== 'test')
        throw new InternalServerErrorException(
          'Email delivery is not configured',
        )
      this.logger.debug(`Test OTP generated for ${purpose}`)
      return
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to,
        subject:
          purpose === OtpPurpose.VERIFICATION
            ? 'DOMROV email verification code'
            : 'DOMROV password reset code',
        text: `Your DOMROV code is: ${otp}`,
      })
    } catch {
      // Upstream SMTP errors can contain message content or credentials.
      this.logger.warn('SMTP delivery failed')
      throw new InternalServerErrorException('Email delivery failed')
    }
  }
}
