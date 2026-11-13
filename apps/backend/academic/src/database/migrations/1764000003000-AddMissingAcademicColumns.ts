import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAcademicColumns1764000003000 implements MigrationInterface {
  name = 'AddMissingAcademicColumns1764000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "cover_image_url" text');
    await queryRunner.query('ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "content_type" text');
    await queryRunner.query('ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "size" bigint');
    await queryRunner.query('ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "storage_provider" varchar(30) NOT NULL DEFAULT \'external\'');
    await queryRunner.query('ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "comments" text');
    await queryRunner.query('ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "start_at" timestamptz');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "allow_late" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "submission_type" varchar(30) NOT NULL DEFAULT \'INDIVIDUAL\'');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "allowed_submission_method" varchar(30) NOT NULL DEFAULT \'ANY\'');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "session" integer');
    await queryRunner.query('ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "submissions" DROP COLUMN IF EXISTS "submitted_at"');
    await queryRunner.query('ALTER TABLE "submissions" DROP COLUMN IF EXISTS "comments"');
    await queryRunner.query('ALTER TABLE "resources" DROP COLUMN IF EXISTS "storage_provider"');
    await queryRunner.query('ALTER TABLE "resources" DROP COLUMN IF EXISTS "size"');
    await queryRunner.query('ALTER TABLE "resources" DROP COLUMN IF EXISTS "content_type"');
    await queryRunner.query('ALTER TABLE "classes" DROP COLUMN IF EXISTS "cover_image_url"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "is_public"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "session"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "allowed_submission_method"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "submission_type"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "allow_late"');
    await queryRunner.query('ALTER TABLE "assignments" DROP COLUMN IF EXISTS "start_at"');
  }
}
