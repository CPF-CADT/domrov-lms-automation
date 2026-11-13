import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseStringUserIds1764000002000 implements MigrationInterface {
  name = 'UseStringUserIds1764000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "graded_by" varchar');
    for (const table of ['classes', 'enrollments', 'teams', 'team_members', 'resources', 'submissions']) {
      const columns = table === 'classes' || table === 'resources'
        ? ['owner_id']
        : table === 'teams'
          ? ['leader_id']
          : table === 'submissions'
            ? ['user_id', 'graded_by']
            : ['user_id'];
      for (const column of columns) {
        await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE varchar USING "${column}"::text`);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['classes', 'enrollments', 'teams', 'team_members', 'resources', 'submissions']) {
      const columns = table === 'classes' || table === 'resources'
        ? ['owner_id']
        : table === 'teams'
          ? ['leader_id']
          : table === 'submissions'
            ? ['user_id', 'graded_by']
            : ['user_id'];
      for (const column of columns) {
        await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE uuid USING "${column}"::uuid`);
      }
    }
    await queryRunner.query('ALTER TABLE "submissions" DROP COLUMN IF EXISTS "graded_by"');
  }
}
