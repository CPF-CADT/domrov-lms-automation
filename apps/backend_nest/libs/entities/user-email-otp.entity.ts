import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: 'user_email_otp' })
export class UserEmailOtp extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.emailOtps)
    @JoinColumn()
    user: User;

    @Column()
    otp: string; 

    @Column({ type: 'timestamp' })
    expiresAt: Date;
}
