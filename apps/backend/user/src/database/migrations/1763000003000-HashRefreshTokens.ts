import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Development cutover: all existing refresh sessions are invalidated.
 * Production requires a reviewed migration/cutover plan before running this:
 * old application instances cannot use the new schema, and users must log in again.
 */
export class HashRefreshTokens1763000003000 implements MigrationInterface {
  name = 'HashRefreshTokens1763000003000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM runs migrations in a transaction; block session writes at cutover.
    await queryRunner.query(
      `LOCK TABLE "user_refresh_token" IN ACCESS EXCLUSIVE MODE`,
    )
    await queryRunner.query(`DELETE FROM "user_refresh_token"`)
    await queryRunner.query(
      `ALTER TABLE "user_refresh_token" ADD "token_hash" character varying(64) NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_refresh_token" ADD CONSTRAINT "UQ_user_refresh_token_hash" UNIQUE ("token_hash")`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_refresh_token" DROP COLUMN "refreshToken"`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Hashes cannot recover plaintext. Rollback also invalidates all sessions.
    await queryRunner.query(
      `LOCK TABLE "user_refresh_token" IN ACCESS EXCLUSIVE MODE`,
    )
    await queryRunner.query(`DELETE FROM "user_refresh_token"`)
    await queryRunner.query(
      `ALTER TABLE "user_refresh_token" DROP COLUMN "token_hash"`,
    )
    await queryRunner.query(
      `ALTER TABLE "user_refresh_token" ADD "refreshToken" character varying(2048) NOT NULL`,
    )
  }
}
