import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniquePaymentProviderReference1764000003000 implements MigrationInterface {
  name = 'UniquePaymentProviderReference1764000003000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_payment_provider_reference_unique" ON "payments" ("providerReference")');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_payment_provider_reference_unique"');
  }
}
