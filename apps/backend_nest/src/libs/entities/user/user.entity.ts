import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserStatus } from '../../enums/Status';
import { Class } from '../classroom/class.entity';
import { Enrollment } from '../classroom/enrollment.entity';
import { Team } from '../classroom/team.entity';
import { TeamMember } from '../classroom/user-team.entity';
import { OAuthAccount } from './oauth-account.entity';
import { TelegramChat } from './telegram-chat.entity';
import { AIUsageLog } from '../ai/ai-usage-log.entity';
import { UserCreditBalance } from '../ai/user-credit-balance.entity';
import { Payment } from '../ai/payment.entity';
import { Submission } from '../assessment/submission.entity';
import { UserRefreshToken } from './user-refresh-token.entity';
import { UserEmailOtp } from './user-email-otp.entity';
import { UserAIKey } from '../ai/user-ai-key.entity';
import { Notification } from './notification.entity';
import { BaseEntity } from '../base.entity';
import { SystemRole } from '../../enums/Role';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100, nullable: true })
  lastName?: string;

  @Column({ length: 10, nullable: true })
  gender?: string;

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ length: 50, unique: true, nullable: true })
  phoneNumber?: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ nullable: true })
  profilePictureUrl?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isTwoFactorEnable: boolean;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.INACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.User,
  })
  role: SystemRole;

  @OneToMany(() => UserAIKey, (key) => key.user)
  aiKeys?: UserAIKey[];

  @OneToMany(() => Class, (cls) => cls.owner)
  classes?: Class[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.user)
  enrollments?: Enrollment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @OneToMany(() => Team, (team) => team.leader)
  leadTeams?: Team[];

  @OneToMany(() => TeamMember, (member) => member.user)
  teamMemberships?: TeamMember[];

  @OneToMany(() => OAuthAccount, (account) => account.user)
  oauthAccounts?: OAuthAccount[];

  @OneToMany(() => TelegramChat, (chat) => chat.user)
  telegramChats?: TelegramChat[];

  @OneToMany(() => AIUsageLog, (log) => log.user)
  usageLogs?: AIUsageLog[];

  @OneToOne(() => UserCreditBalance, (balance) => balance.user, { nullable: true })
  creditBalance?: UserCreditBalance;

  @OneToMany(() => Payment, (payment) => payment.user)
  payments?: Payment[];

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions?: Submission[];

  @OneToMany(() => UserRefreshToken, (token) => token.user)
  refreshTokens?: UserRefreshToken[];

  @OneToOne(() => UserEmailOtp, (ueo) => ueo.user, { nullable: true })
  emailOtps?: UserEmailOtp;
}