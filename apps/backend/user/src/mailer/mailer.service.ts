import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { OtpPurpose } from '../entities/user-email-otp.entity';
import { logger } from '../logging';

@Injectable()
export class MailerService {
  private readonly transporter?: Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: { user: this.config.getOrThrow<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') ?? this.config.getOrThrow<string>('SMTP_PASS') },
      });
    }
  }

  async sendOtp(to: string, otp: string, purpose: OtpPurpose) {
    const startedAt = performance.now();
    const fields = { dependency: 'smtp', operation: purpose };
    if (!this.transporter) {
      if (this.config.get('NODE_ENV') !== 'test') {
        logger.warn('smtp.delivery_unavailable', 'SMTP delivery is not configured', { ...fields, error_code: 'not_configured' });
        throw new InternalServerErrorException('Email delivery is not configured');
      }
      logger.debug('smtp.delivery_skipped', 'SMTP delivery skipped in test mode', fields);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to,
        subject: purpose === OtpPurpose.VERIFICATION ? 'DOMROV email verification code' : 'DOMROV password reset code',
        text: `Your DOMROV code is: ${otp}`,
      });
      logger.debug('smtp.delivery_succeeded', 'SMTP accepted the OTP message', { ...fields, duration_ms: performance.now() - startedAt });
    } catch (error) {
      const required = this.config.get<string>('SMTP_REQUIRED', 'false').toLowerCase() === 'true';
      const timedOut = error instanceof Error && 'code' in error && error.code === 'ETIMEDOUT';
      logger.warn(timedOut ? 'smtp.delivery_timeout' : 'smtp.delivery_failed', 'SMTP did not accept the OTP message', {
        ...fields,
        duration_ms: performance.now() - startedAt,
        outcome: required ? 'required_delivery_failed' : 'otp_retained',
        error_code: timedOut ? 'timeout' : 'delivery_error',
      });
      if (!required) return;
      throw new InternalServerErrorException('Email delivery failed');
    }
  }
}
