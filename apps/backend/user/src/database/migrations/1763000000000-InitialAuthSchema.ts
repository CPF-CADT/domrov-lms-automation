import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthSchema1763000000000 implements MigrationInterface {
  name = 'InitialAuthSchema1763000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED')`);
    await queryRunner.query(`CREATE TYPE "system_role_enum" AS ENUM ('SuperAdmin', 'Admin', 'Support', 'User')`);
    await queryRunner.query(`CREATE TYPE "user_email_otp_purpose_enum" AS ENUM ('verification', 'password_reset')`);
    await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "gender" character varying(10), "dob" date, "phoneNumber" character varying(50), "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "profilePictureUrl" character varying, "isVerified" boolean NOT NULL DEFAULT false, "isTwoFactorEnable" boolean NOT NULL DEFAULT false, "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE', "role" "system_role_enum" NOT NULL DEFAULT 'User', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_users_phone" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_users_email" UNIQUE ("email"))`);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE TABLE "user_refresh_token" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "refreshToken" character varying(2048) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_user_refresh_token_id" PRIMARY KEY ("id"), CONSTRAINT "FK_user_refresh_token_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE TABLE "user_email_otp" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "otp" character varying(6) NOT NULL, "purpose" "user_email_otp_purpose_enum" NOT NULL DEFAULT 'verification', "expiresAt" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_user_email_otp_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_user_email_otp_user" UNIQUE ("user_id"), CONSTRAINT "FK_user_email_otp_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_email_otp"`);
    await queryRunner.query(`DROP TABLE "user_refresh_token"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_email_otp_purpose_enum"`);
    await queryRunner.query(`DROP TYPE "system_role_enum"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
  }
}
