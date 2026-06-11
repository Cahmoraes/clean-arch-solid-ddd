-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVATED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVATED';
