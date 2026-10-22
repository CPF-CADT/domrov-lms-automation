import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: 'user_email_otp' })
export class UserEmailOtp extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.emailOtps, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @Column()
    otp: string;

    // A user can have different one-time codes for verification and recovery.
    @Column({ default: 'verification' })
    purpose: 'verification' | 'password_reset';

    @Column({ type: 'timestamp' })
    expiresAt: Date;
}
