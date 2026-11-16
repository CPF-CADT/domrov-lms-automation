import { InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'
import { OtpPurpose } from '../src/entities/user-email-otp.entity'
import { MailerService } from '../src/mailer/mailer.service'

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }))

describe('OTP SMTP delivery', () => {
  const createTransport = jest.mocked(nodemailer.createTransport)
  let sendMail: jest.Mock
  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ accepted: ['mail@example.com'] })
    createTransport.mockReturnValue({ sendMail })
  })
  afterEach(() => jest.restoreAllMocks())

  it('preserves Mailpit without authentication and numeric port configuration', async () => {
    const mailer = new MailerService(new ConfigService({
      SMTP_HOST: 'mailpit', SMTP_PORT: '1025', SMTP_FROM: 'no-reply@example.com',
    }))
    await mailer.sendOtp('mail@example.com', '123456', OtpPurpose.VERIFICATION)
    expect(createTransport).toHaveBeenLastCalledWith({
      host: 'mailpit', port: 1025, secure: false,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000,
    })
    const message = sendMail.mock.calls[0][0] as Record<string, unknown>
    expect(message.subject).toBe('DOMROV email verification code')
    expect(message.to).toBe('mail@example.com')
    expect(message.from).toBe('no-reply@example.com')
    expect(typeof message.text).toBe('string')
  })

  it.each(['SMTP_PASSWORD', 'SMTP_PASS'])('preserves authenticated TLS SMTP with %s', (key) => {
    new MailerService(new ConfigService({
      SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_USER: 'test-user', [key]: 'test-password',
    }))
    const options = createTransport.mock.calls.at(-1)![0]
    expect(options.secure).toBe(true)
    expect(Object.keys(options.auth as object).sort()).toEqual(['pass', 'user'])
  })

  it('propagates delivery failure even with SMTP_REQUIRED=false and sanitizes logs', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const mailer = new MailerService(new ConfigService({ SMTP_HOST: 'mailpit', SMTP_REQUIRED: 'false' }))
    sendMail.mockRejectedValueOnce(new Error('upstream details must not be logged'))
    await expect(mailer.sendOtp('mail@example.com', '123456', OtpPurpose.PASSWORD_RESET))
      .rejects.toBeInstanceOf(InternalServerErrorException)
    expect(warn).toHaveBeenCalledWith('SMTP delivery failed')
  })

  it('fails clearly without SMTP outside tests', async () => {
    const mailer = new MailerService(new ConfigService({ NODE_ENV: 'development' }))
    await expect(mailer.sendOtp('mail@example.com', '123456', OtpPurpose.VERIFICATION))
      .rejects.toThrow('Email delivery is not configured')
  })
})
