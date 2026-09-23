# Task 2: Schema Prisma `Plan` + migration + seed [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Adiciona o modelo `Plan` ao schema Prisma (tabela `plans`) e a migration que a cria. A própria
migration já popula os dois planos hoje hardcoded em `DEMO_PLANS` (nome, preço, tagline,
features, incluindo os `priceId` demo `price_demo_monthly`/`price_demo_yearly` em
`stripe_price_id`) via `INSERT ... ON CONFLICT DO NOTHING`, para que o primeiro deploy não deixe
`/assinatura`/home vazias (Risco da spec) e para que reexecuções da migration não dupliquem os
planos (Review Focus desta task). O seed fica **na própria migration SQL**, não em
`prisma/seed.ts` — decisão explícita da spec ("Mitigação" do risco de seed não rodar em algum
ambiente).

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.sql`
- Test: `apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts`

## Interfaces

- **Consome:** `BILLING_PERIODS = ["monthly", "yearly"] as const` (task-01, `plan.ts`) — os
  valores do enum Prisma `BillingPeriod` (`monthly`, `yearly`) espelham exatamente esses nomes,
  no mesmo estilo minúsculo já usado por `SubscriptionStatus`.
- **Produz:** `model Plan` no `schema.prisma` (`id, name, price_cents, billing_period, tagline,
  features, is_active, stripe_price_id, created_at, updated_at`, `@@map("plans")`) + `enum
  BillingPeriod { monthly yearly }`; migration SQL que cria a tabela e insere os 2 planos seed de
  forma idempotente (`ON CONFLICT ("id") DO NOTHING`).

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de schema/migration backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (seção "Integração com BD (Prisma)").

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

const migrationPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"migration.sql",
)

describe("migration 20260922123000_create_plan_model", () => {
	test("cria a tabela plans", () => {
		const sql = readFileSync(migrationPath, "utf-8")
		expect(sql).toMatch(/CREATE TABLE "plans"/)
	})

	test("popula os priceId demo atuais em stripe_price_id", () => {
		const sql = readFileSync(migrationPath, "utf-8")
		expect(sql).toContain("price_demo_monthly")
		expect(sql).toContain("price_demo_yearly")
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../migration.sql'`

- **Step 2: Review Focus: o seed da migration não duplica os planos em reexecuções (idempotência) — Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
test("o seed de planos é idempotente (ON CONFLICT ... DO NOTHING), não um INSERT puro que duplicaria em reexecuções", () => {
	const sql = readFileSync(migrationPath, "utf-8")
	expect(sql).toMatch(/INSERT INTO "plans"/)
	expect(sql).toMatch(/ON CONFLICT \("id"\) DO NOTHING/)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../migration.sql'` (mesmo arquivo
ausente do Step 1; este teste pina especificamente a idempotência do `INSERT`, não apenas a
existência da tabela)

- **Step 3: Write minimal implementation**

```prisma
// apps/backend/prisma/schema.prisma — adicionar após "model Subscription { ... }"
model Plan {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String
  price_cents     Int
  billing_period  BillingPeriod
  tagline         String
  features        String[]
  is_active       Boolean       @default(true)
  // Reservado para integração futura com Stripe Products API (fora de escopo desta
  // feature — ver "Fora do Escopo" na spec). Vazio por padrão quando o admin não preenche.
  stripe_price_id String?       @default("")
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  @@map("plans")
}

enum BillingPeriod {
  monthly
  yearly
}
```

```sql
-- apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.sql

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
```

Run: `pnpm --filter backend prisma:migrate:dev` then `pnpm --filter backend prisma:generate`
Expected: migration aplicada, cliente Prisma regenerado com `prismaClient.plan` disponível (sem
isso, `PrismaPlanRepository` da task-03 não compila)

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts`
Expected: PASS

- **Step 4: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/prisma/schema.prisma \
  apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.sql \
  apps/backend/prisma/migrations/20260922123000_create_plan_model/migration.seed.test.ts
git commit -m "feat(subscription): add Plan Prisma model with seeded migration"
```

## Critérios de Sucesso

- `pnpm --filter backend prisma:migrate:dev` cria a tabela `plans` com os campos da spec (Decisão
  D2: `price_cents` + `billing_period` estruturados, não texto livre).
- Reexecutar a migration (ou rodá-la em um ambiente onde os planos seed já existem) não duplica
  os registros — `ON CONFLICT ("id") DO NOTHING` (Review Focus, FR-001).
- Após a migration, a tabela contém os 2 planos hoje hardcoded, preservando `price_demo_monthly`
  e `price_demo_yearly` em `stripe_price_id` — continuidade do fluxo de assinatura demo e da tela
  pública no primeiro deploy (spec, seção "Migration").
