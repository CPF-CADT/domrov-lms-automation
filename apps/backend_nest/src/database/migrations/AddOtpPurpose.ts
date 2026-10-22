import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpPurpose implements MigrationInterface {
  name = 'AddOtpPurpose';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_email_otp" ADD COLUMN IF NOT EXISTS "purpose" character varying NOT NULL DEFAULT 'verification'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_email_otp" DROP COLUMN IF EXISTS "purpose"`);
  }
}
