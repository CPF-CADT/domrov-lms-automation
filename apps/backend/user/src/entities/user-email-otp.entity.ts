import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

export enum OtpPurpose {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity({ name: 'user_email_otp' })
@Check('CK_user_email_otp_hash', `"otp_hash" ~ '^[a-f0-9]{64}$'`)
@Check('CK_user_email_otp_attempts', '"failed_attempts" BETWEEN 0 AND 5')
export class UserEmailOtp {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ name: 'user_id', unique: true })
  userId!: number

  @Column({ name: 'otp_hash', type: 'varchar', length: 64 })
  otpHash!: string

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts!: number

  @Column({ name: 'issued_at', type: 'timestamp' })
  issuedAt!: Date

  @Column({ type: 'enum', enum: OtpPurpose, default: OtpPurpose.VERIFICATION })
  purpose!: OtpPurpose

  @Column({ type: 'timestamp' })
  expiresAt!: Date

  @CreateDateColumn()
  created_at!: Date
}
