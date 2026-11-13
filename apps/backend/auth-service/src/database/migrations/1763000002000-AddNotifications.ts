import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1763000002000 implements MigrationInterface {
  name = 'AddNotifications1763000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM ('info', 'warning', 'alert')`);
    await queryRunner.query(`CREATE TYPE "notification_status_enum" AS ENUM ('unread', 'read')`);
    await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "type" "notification_type_enum" NOT NULL DEFAULT 'info', "status" "notification_status_enum" NOT NULL DEFAULT 'unread', "title" character varying(255) NOT NULL, "message" text, "action_url" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"), CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_status" ON "notifications" ("user_id", "status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_status"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
