import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRubricCriterion1764000005000 implements MigrationInterface {
  name = 'AddRubricCriterion1764000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "rubrics" ADD COLUMN IF NOT EXISTS "criterion" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "rubrics" DROP COLUMN IF EXISTS "criterion"');
  }
}
