-- AlterTable
ALTER TABLE "subscriptions"
  ADD COLUMN "plan_id" UUID,
  ADD COLUMN "current_period_start" TIMESTAMP(3),
  ADD COLUMN "current_period_end" TIMESTAMP(3),
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;

-- Backfill de linhas legadas: periodo = created_at ate created_at + 1 mes
UPDATE "subscriptions"
SET "current_period_start" = "created_at",
    "current_period_end" = "created_at" + INTERVAL '1 month';

ALTER TABLE "subscriptions"
  ALTER COLUMN "current_period_start" SET NOT NULL,
  ALTER COLUMN "current_period_start" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "current_period_end" SET NOT NULL,
  ALTER COLUMN "current_period_end" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- AddForeignKey
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Uma unica assinatura ativa por usuario (indice unico parcial, fora do schema.prisma)
CREATE UNIQUE INDEX "subscriptions_user_id_active_key"
  ON "subscriptions" ("user_id")
  WHERE "status" = 'active';
