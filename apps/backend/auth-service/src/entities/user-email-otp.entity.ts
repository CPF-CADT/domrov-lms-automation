import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export enum OtpPurpose {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity({ name: 'user_email_otp' })
export class UserEmailOtp {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', unique: true })
  userId!: number;

  @Column({ length: 6 })
  otp!: string;

  @Column({ type: 'enum', enum: OtpPurpose, default: OtpPurpose.VERIFICATION })
  purpose!: OtpPurpose;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
