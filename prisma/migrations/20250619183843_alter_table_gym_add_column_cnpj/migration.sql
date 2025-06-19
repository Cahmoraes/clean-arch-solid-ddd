/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `gyms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cnpj` to the `gyms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "cnpj" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "gyms_cnpj_key" ON "gyms"("cnpj");
