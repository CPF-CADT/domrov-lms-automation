import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { OtpPurpose } from '../entities/user-email-otp.entity';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
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
    if (!this.transporter) {
      if (this.config.get('NODE_ENV') !== 'test') throw new InternalServerErrorException('Email delivery is not configured');
      this.logger.debug(`Test OTP generated for ${purpose}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to,
        subject: purpose === OtpPurpose.VERIFICATION ? 'DOMROV email verification code' : 'DOMROV password reset code',
        text: `Your DOMROV code is: ${otp}`,
      });
    } catch (error) {
      if (this.config.get<string>('SMTP_REQUIRED', 'false').toLowerCase() !== 'true') {
        this.logger.warn(`SMTP delivery failed; OTP remains stored for retry: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      throw new InternalServerErrorException('Email delivery failed');
    }
  }
}
