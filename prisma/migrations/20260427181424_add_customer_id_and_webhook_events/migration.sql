-- AlterTable: adicionar customer_id como nullable para permitir backfill
ALTER TABLE "subscriptions" ADD COLUMN "customer_id" TEXT;

-- Backfill: preencher customer_id a partir de users.billing_customer_id
UPDATE "subscriptions" s
SET "customer_id" = u."billing_customer_id"
FROM "users" u
WHERE s."user_id" = u."id";

-- Validar que o backfill foi completo antes de aplicar NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "subscriptions"
    WHERE "customer_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem linhas em subscriptions sem customer_id. Preencha users.billing_customer_id para todos os usuários com assinatura antes de aplicar esta migration.';
  END IF;
END $$;

-- Aplicar NOT NULL após backfill validado
ALTER TABLE "subscriptions" ALTER COLUMN "customer_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions"("customer_id");

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_event_id_key" ON "stripe_webhook_events"("event_id");
