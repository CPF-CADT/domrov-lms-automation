import { MigrationInterface, QueryRunner } from 'typeorm'

// Development cutover only. Production requires a reviewed deployment plan.
export class HardenEmailOtps1763000004000 implements MigrationInterface {
  name = 'HardenEmailOtps1763000004000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "user_email_otp" IN ACCESS EXCLUSIVE MODE')
    await queryRunner.query('DELETE FROM "user_email_otp"')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD "otp_hash" character varying(64) NOT NULL')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD "failed_attempts" integer NOT NULL DEFAULT 0')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD "issued_at" TIMESTAMP NOT NULL')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD CONSTRAINT "CK_user_email_otp_hash" CHECK ("otp_hash" ~ \'^[a-f0-9]{64}$\')')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD CONSTRAINT "CK_user_email_otp_attempts" CHECK ("failed_attempts" BETWEEN 0 AND 5)')
    await queryRunner.query('ALTER TABLE "user_email_otp" DROP COLUMN "otp"')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "user_email_otp" IN ACCESS EXCLUSIVE MODE')
    await queryRunner.query('DELETE FROM "user_email_otp"')
    await queryRunner.query('ALTER TABLE "user_email_otp" DROP CONSTRAINT "CK_user_email_otp_hash"')
    await queryRunner.query('ALTER TABLE "user_email_otp" DROP CONSTRAINT "CK_user_email_otp_attempts"')
    await queryRunner.query('ALTER TABLE "user_email_otp" DROP COLUMN "otp_hash", DROP COLUMN "failed_attempts", DROP COLUMN "issued_at"')
    await queryRunner.query('ALTER TABLE "user_email_otp" ADD "otp" character varying(6) NOT NULL')
  }
}
