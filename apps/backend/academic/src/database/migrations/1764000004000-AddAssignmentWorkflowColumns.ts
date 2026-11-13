import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentWorkflowColumns1764000004000 implements MigrationInterface {
  name = 'AddAssignmentWorkflowColumns1764000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "start_at" timestamptz');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "allow_late" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "submission_type" varchar(30) NOT NULL DEFAULT \'INDIVIDUAL\'');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "allowed_submission_method" varchar(30) NOT NULL DEFAULT \'ANY\'');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "session" integer');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "is_public"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "session"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "allowed_submission_method"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "submission_type"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "allow_late"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "start_at"');
  }
}
