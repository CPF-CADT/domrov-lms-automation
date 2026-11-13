import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthAccounts1763000001000 implements MigrationInterface {
  name = 'AddOAuthAccounts1763000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "oauth_accounts" ("id" SERIAL NOT NULL, "provider" character varying(32) NOT NULL, "account_id" character varying(255) NOT NULL, "user_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_oauth_accounts_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_oauth_account_provider_account" UNIQUE ("provider", "account_id"), CONSTRAINT "FK_oauth_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
  }
}
