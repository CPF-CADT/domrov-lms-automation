import { MigrationInterface, QueryRunner } from 'typeorm';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Classifies existing rows without changing Resource.url. Rows that do not
 * have a matching local file are explicitly marked r2 for controlled,
 * temporary compatibility rather than being silently treated as local.
 */
export class ClassifyResourceStorage1761000000000 implements MigrationInterface {
  name = 'ClassifyResourceStorage1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const root = resolve(process.env.LOCAL_FILE_ROOT || '/data/files', 'permanent');
    const rows: Array<{ id: number; url: string; storageProvider: string | null }> =
      await queryRunner.query(`SELECT id, url, "storageProvider" FROM "resources" WHERE "storageProvider" IS NULL`);

    for (const row of rows) {
      const value = String(row.url || '');
      let provider = 'r2';
      if (/^https?:\/\/(?:www\.)?github\.com(?:\/|$)/i.test(value)) provider = 'github';
      else if (/^https?:\/\//i.test(value)) provider = 'external';
      else if (!value.startsWith('/') && !value.includes('\0') && existsSync(resolve(root, value))) provider = 'local';

      await queryRunner.query(
        `UPDATE "resources" SET "storageProvider" = $1 WHERE id = $2`,
        [provider, row.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "resources" SET "storageProvider" = NULL WHERE "storageProvider" IN ('local', 'external', 'github', 'r2')`);
  }
}
