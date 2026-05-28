-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'locked';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- DataMigration: root admin user gets super admin flag
UPDATE "users" SET "is_super_admin" = true WHERE "email" = 'admin@admin.com';
