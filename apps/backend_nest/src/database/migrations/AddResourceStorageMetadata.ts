import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceStorageMetadata implements MigrationInterface {
  name = 'AddResourceStorageMetadata';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('resources', 'storageProvider'))) {
      await queryRunner.query(`ALTER TABLE "resources" ADD "storageProvider" character varying(32)`);
    }
    if (!(await queryRunner.hasColumn('resources', 'contentType'))) {
      await queryRunner.query(`ALTER TABLE "resources" ADD "contentType" character varying(255)`);
    }
    if (!(await queryRunner.hasColumn('resources', 'size'))) {
      await queryRunner.query(`ALTER TABLE "resources" ADD "size" bigint`);
    }
    if (!(await queryRunner.hasColumn('resources', 'checksum'))) {
      await queryRunner.query(`ALTER TABLE "resources" ADD "checksum" character varying(64)`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('resources', 'checksum')) await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "checksum"`);
    if (await queryRunner.hasColumn('resources', 'size')) await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "size"`);
    if (await queryRunner.hasColumn('resources', 'contentType')) await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "contentType"`);
    if (await queryRunner.hasColumn('resources', 'storageProvider')) await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "storageProvider"`);
  }
}
