import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763511966751 implements MigrationInterface {
  name = 'Migration1763511966751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."TOKEN_TYPE" AS ENUM('access', 'refresh')`,
    );
    await queryRunner.query(
      `CREATE TABLE "token" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "token" text NOT NULL, "type" "public"."TOKEN_TYPE" NOT NULL, "user_id" integer, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "role" "public"."users_role_enum" NOT NULL, "first_name" text NOT NULL, "last_name" text NOT NULL, "email" text NOT NULL, "password" text NOT NULL, "phone" text NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "brands" ALTER COLUMN "theme" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_e50ca89d635960fda2ffeb17639" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT "FK_e50ca89d635960fda2ffeb17639"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brands" ALTER COLUMN "theme" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "token"`);
    await queryRunner.query(`DROP TYPE "public"."TOKEN_TYPE"`);
  }
}
