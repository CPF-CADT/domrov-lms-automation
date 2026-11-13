import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPaymentSchema1764000000000 implements MigrationInterface {
  name = 'InitialPaymentSchema1764000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await q.query(`CREATE TABLE "wallet_balances" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "availableCredits" numeric(18,4) NOT NULL DEFAULT 0, "reservedCredits" numeric(18,4) NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wallet_balances" PRIMARY KEY ("id"))`);
    await q.query('CREATE UNIQUE INDEX "IDX_wallet_user" ON "wallet_balances" ("user_id")');
    await q.query(`CREATE TABLE "credit_packages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" varchar NOT NULL, "credits" numeric(18,4) NOT NULL, "price" numeric(18,4) NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'USD', "isActive" boolean NOT NULL DEFAULT true, "bonusCredits" numeric(18,4) NOT NULL DEFAULT 0, "sortOrder" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_credit_packages" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "credit_package_id" uuid NOT NULL, "amount" numeric(18,4) NOT NULL, "currency" varchar(3) NOT NULL, "status" varchar NOT NULL DEFAULT 'pending', "providerReference" varchar, "providerMetadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_payments" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "credit_reservations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "amount" numeric(18,4) NOT NULL, "reference_id" uuid NOT NULL, "status" varchar NOT NULL DEFAULT 'reserved', "idempotency_key" varchar NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_credit_reservations" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "amount" numeric(18,4) NOT NULL, "type" varchar NOT NULL, "reason" varchar NOT NULL, "reference_id" varchar, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "idempotency_records" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "idempotency_key" varchar NOT NULL, "operation" varchar NOT NULL, "statusCode" integer NOT NULL, "response" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_idempotency_records" PRIMARY KEY ("id"))`);
    await q.query('CREATE UNIQUE INDEX "IDX_idempotency_key" ON "idempotency_records" ("idempotency_key")');
  }
  async down(q: QueryRunner): Promise<void> { for (const table of ['idempotency_records', 'wallet_transactions', 'credit_reservations', 'payments', 'credit_packages', 'wallet_balances']) await q.query(`DROP TABLE IF EXISTS "${table}"`); }
}
