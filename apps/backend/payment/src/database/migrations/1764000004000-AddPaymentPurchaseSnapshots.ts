import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentPurchaseSnapshots1764000004000 implements MigrationInterface {
  name = 'AddPaymentPurchaseSnapshots1764000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('payments', new TableColumn({ name: 'package_name_snapshot', type: 'varchar', isNullable: true }));
    await queryRunner.addColumn('payments', new TableColumn({ name: 'credits_snapshot', type: 'numeric', precision: 18, scale: 4, isNullable: true }));
    await queryRunner.query(`
      UPDATE payments AS payment
      SET package_name_snapshot = COALESCE(package.name, 'Credit package'),
          credits_snapshot = COALESCE(package.credits, 0) + COALESCE(package."bonusCredits", 0)
      FROM credit_packages AS package
      WHERE payment.credit_package_id = package.id
        AND (payment.package_name_snapshot IS NULL OR payment.credits_snapshot IS NULL)
    `);
    await queryRunner.query(`
      UPDATE payments AS payment
      SET credits_snapshot = transaction.amount
      FROM wallet_transactions AS transaction
      WHERE payment.status = 'completed'
        AND transaction.type = 'credit'
        AND transaction.reason = 'purchase'
        AND transaction.metadata->>'paymentId' = payment.id::text
    `);
    await queryRunner.query(`UPDATE payments SET package_name_snapshot = 'Credit package' WHERE package_name_snapshot IS NULL`);
    await queryRunner.query(`UPDATE payments SET credits_snapshot = 0 WHERE credits_snapshot IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('payments', 'credits_snapshot');
    await queryRunner.dropColumn('payments', 'package_name_snapshot');
  }
}
