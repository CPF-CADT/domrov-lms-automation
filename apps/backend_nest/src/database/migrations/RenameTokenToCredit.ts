import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTokenToCredit1700000000000 implements MigrationInterface {
    name = 'RenameTokenToCredit1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename user_token_balances table to user_credit_balances
        await queryRunner.query(
            `ALTER TABLE IF EXISTS "user_token_balances" RENAME TO "user_credit_balances"`,
        );

        // Rename tokenBalance column to creditBalance
        await queryRunner.query(
            `ALTER TABLE "user_credit_balances" RENAME COLUMN "tokenBalance" TO "creditBalance"`,
        );

        // Rename token_packages table to credit_packages
        await queryRunner.query(
            `ALTER TABLE IF EXISTS "token_packages" RENAME TO "credit_packages"`,
        );

        // Rename tokens column to credits in credit_packages
        await queryRunner.query(
            `ALTER TABLE "credit_packages" RENAME COLUMN "tokens" TO "credits"`,
        );

        // Rename bonusTokens column to bonusCredits in credit_packages
        await queryRunner.query(
            `ALTER TABLE "credit_packages" RENAME COLUMN "bonusTokens" TO "bonusCredits"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert credit_packages changes
        await queryRunner.query(
            `ALTER TABLE "credit_packages" RENAME COLUMN "bonusCredits" TO "bonusTokens"`,
        );

        await queryRunner.query(
            `ALTER TABLE "credit_packages" RENAME COLUMN "credits" TO "tokens"`,
        );

        await queryRunner.query(
            `ALTER TABLE "credit_packages" RENAME TO "token_packages"`,
        );

        // Revert user_credit_balances changes
        await queryRunner.query(
            `ALTER TABLE "user_credit_balances" RENAME COLUMN "creditBalance" TO "tokenBalance"`,
        );

        await queryRunner.query(
            `ALTER TABLE "user_credit_balances" RENAME TO "user_token_balances"`,
        );
    }
}
