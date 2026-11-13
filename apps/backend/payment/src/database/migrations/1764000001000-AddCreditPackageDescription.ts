import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCreditPackageDescription1764000001000 implements MigrationInterface {
  name = 'AddCreditPackageDescription1764000001000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('credit_packages', new TableColumn({ name: 'description', type: 'text', isNullable: true }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('credit_packages', 'description');
  }
}
