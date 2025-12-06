import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1762397370466 implements MigrationInterface {
  name = 'Migration1762397370466';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."brands_key_enum" AS ENUM('Brillipoint', 'Lusso Recepciones', 'Aletvia Glow and Hair')`,
    );
    await queryRunner.query(
      `CREATE TABLE "brands" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "key" "public"."brands_key_enum" NOT NULL, "name" text NOT NULL, "theme" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(`DROP TYPE "public"."brands_key_enum"`);
  }
}
