-- CreateEnum
CREATE TYPE "GymStatus" AS ENUM ('activated', 'deactivated');

-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "status" "GymStatus" NOT NULL DEFAULT 'activated';
