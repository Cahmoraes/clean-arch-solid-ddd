-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('monthly', 'yearly');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "tagline" TEXT NOT NULL,
    "features" TEXT[] NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_price_id" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- SeedData: planos hoje hardcoded em DEMO_PLANS (apps/backend/src/subscription/domain/plans.ts).
-- Idempotente: reexecutar esta migration nunca duplica os planos.
INSERT INTO "plans" ("id", "name", "price_cents", "billing_period", "tagline", "features", "is_active", "stripe_price_id", "updated_at")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Premium Mensal', 4990, 'monthly', 'Acesso ilimitado a todas as academias parceiras.', ARRAY['Check-ins ilimitados','Histórico completo de visitas','Suporte prioritário'], true, 'price_demo_monthly', CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'Premium Anual', 47900, 'yearly', '20% de economia comparado ao plano mensal.', ARRAY['Tudo do Premium Mensal','Pagamento único anual','Economia equivalente a 2 meses grátis'], true, 'price_demo_yearly', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
