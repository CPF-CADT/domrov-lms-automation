import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseStringUserIds1764000002000 implements MigrationInterface {
  name = 'UseStringUserIds1764000002000';

  async up(queryRunner: QueryRunner) {
    for (const table of ['wallet_balances', 'payments', 'credit_reservations', 'wallet_transactions']) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "user_id" TYPE varchar USING "user_id"::text`);
    }
  }

  async down(queryRunner: QueryRunner) {
    for (const table of ['wallet_balances', 'payments', 'credit_reservations', 'wallet_transactions']) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid`);
    }
  }
}
