import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

export enum SystemRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  SUPPORT = 'Support',
  USER = 'User',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Column({ length: 10, nullable: true })
  gender?: string;

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ length: 50, unique: true, nullable: true })
  phoneNumber?: string;

  @Index()
  @Column({ length: 150, unique: true })
  email!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({ nullable: true })
  profilePictureUrl?: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: false })
  isTwoFactorEnable!: boolean;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'enum', enum: SystemRole, default: SystemRole.USER })
  role!: SystemRole;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
