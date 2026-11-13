import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wallet_balances' })
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'user_id', type: 'varchar' }) userId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 }) availableCredits!: number;
  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 }) reservedCredits!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity({ name: 'credit_packages' })
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) credits!: number;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) price!: number;
  @Column({ length: 3, default: 'USD' }) currency!: string;
  @Column({ default: true }) isActive!: boolean;
  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 }) bonusCredits!: number;
  @Column({ default: 0 }) sortOrder!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'varchar' }) userId!: string;
  @Column({ name: 'credit_package_id', type: 'uuid' }) creditPackageId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) amount!: number;
  @Column({ length: 3 }) currency!: string;
  @Column({ default: 'pending' }) status!: string;
  @Column({ nullable: true }) providerReference?: string;
  @Column({ type: 'jsonb', nullable: true }) providerMetadata?: Record<string, unknown>;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity({ name: 'credit_reservations' })
export class CreditReservation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'varchar' }) userId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) amount!: number;
  @Column({ name: 'reference_id', type: 'uuid' }) referenceId!: string;
  @Column({ default: 'reserved' }) status!: string;
  @Column({ name: 'idempotency_key' }) idempotencyKey!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity({ name: 'wallet_transactions' })
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'varchar' }) userId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) amount!: number;
  @Column() type!: string;
  @Column() reason!: string;
  @Column({ name: 'reference_id', nullable: true }) referenceId?: string;
  @Column({ type: 'jsonb', nullable: true }) metadata?: Record<string, unknown>;
  @CreateDateColumn() createdAt!: Date;
}

@Entity({ name: 'idempotency_records' })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'idempotency_key' }) key!: string;
  @Column() operation!: string;
  @Column({ type: 'int' }) statusCode!: number;
  @Column({ type: 'jsonb' }) response!: Record<string, unknown>;
  @CreateDateColumn() createdAt!: Date;
}
