# Task 2: Persistência: migration, repositórios e lookups [FR-001, FR-004]

**Status:** PENDING

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Esta task persiste o vínculo: colunas de plano e período em `subscriptions`, chave estrangeira para `plans` e um índice único parcial que impede duas assinaturas ativas para o mesmo usuário, mesmo sob criações concorrentes. Também entrega os lookups que os casos de uso vão usar (`ofUserId` e `planOfStripePriceId`) nas implementações Prisma e em memória, e faz o repositório Prisma traduzir a violação do índice em `ActiveSubscriptionAlreadyExistsError`.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260923120000_add_plan_link_to_subscriptions/migration.sql`
- Modify: `apps/backend/src/subscription/repository/subscription-repository.ts`
- Modify: `apps/backend/src/subscription/application/repository/plan-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.integration-test.ts`

## Interfaces

- **Consome:** de task-01: `Subscription.create(props: SubscriptionCreate)` (campos opcionais `planId?: string`, `billingPeriod?: BillingPeriod`, `currentPeriodStart?: Date`), `Subscription.restore(props: SubscriptionRestore)` (campos opcionais `planId?: string`, `currentPeriodStart?: Date`, `currentPeriodEnd?: Date`, `cancelAtPeriodEnd?: boolean`), getters `planId: string | undefined`, `currentPeriodStart: Date`, `currentPeriodEnd: Date`, `cancelAtPeriodEnd: boolean`, `scheduleCancellation(now?: Date): void`, `changePlan(planId: string, now?: Date): void`; `ActiveSubscriptionAlreadyExistsError` de `@/subscription/domain/error/active-subscription-already-exists-error.js` (construtor sem argumentos).
- **Produz:**
  - `SubscriptionRepository.ofUserId(userId: string): Promise<Subscription | null>`: devolve a linha do usuário com `status = "active"` no banco (inclusive a vencida por cancelamento agendado; quem decide "vencida" é o caso de uso via `isExpired`), ou `null`.
  - `PlanRepository.planOfStripePriceId(priceId: string): Promise<Plan | null>`: devolve o plano com aquele `stripePriceId` (ativo ou inativo), `null` se não houver ou se `priceId` for vazio.
  - `PrismaSubscriptionRepository.save` lança `ActiveSubscriptionAlreadyExistsError` quando a violação é do índice único parcial `subscriptions_user_id_active_key`; `update` persiste `status`, `canceled_at`, `updated_at`, `plan_id`, `cancel_at_period_end`.
  - Índice único parcial `subscriptions_user_id_active_key` sobre `subscriptions (user_id) WHERE status = 'active'` e colunas `plan_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`.

### Conformidade com as Skills Padrão

- `no-workarounds`: a unicidade é garantida pelo índice do banco (causa), não por retry ou checagem apenas em memória; o erro do índice é traduzido, não engolido.
- `test-antipatterns`: o teste de concorrência usa duas escritas reais contra o Postgres; nada de mock do Prisma.
- `typescript-advanced`: tipagem de `SubscriptionData` com colunas novas anuláveis.

## Passos

- **Step 1: Confirm the environment facts this task depends on**

Confirme, antes de escrever qualquer coisa: (a) em `apps/backend/prisma/schema.prisma` os valores do enum `BillingPeriod` (o código usa `"monthly"`/`"yearly"`; os testes abaixo usam `"monthly"`); (b) que `apps/backend/package.json` tem `prisma:deploy` (`npx prisma migrate deploy`) e `prisma:generate` (`npx prisma generate`); (c) o formato do índice parcial na migration `apps/backend/prisma/migrations/20260530185714_add_notification_tables/migration.sql` (linhas 39 a 41) e copie o estilo; (d) que o banco de desenvolvimento está de pé (`pnpm --filter backend docker:up`); (e) com `rg "implements SubscriptionRepository|implements PlanRepository" apps/backend` que existem só as implementações Prisma e in-memory listadas em Arquivos; se houver outra, ela também recebe o método novo.

- **Step 2: Write the failing test (in-memory)**

Acrescente ao final de `in-memory-subscription-repository.test.ts`, dentro do `describe("InMemorySubscriptionRepository", ...)` e reutilizando `makeSubscription` e `sut` já existentes no arquivo:

```ts
	describe("ofUserId", () => {
		it("retorna a assinatura com status active do usuário", async () => {
			await sut.save(makeSubscription({ id: "s-1", userId: "user-a" }))

			const result = await sut.ofUserId("user-a")

			expect(result?.id).toBe("s-1")
		})

		it("ignora assinaturas canceladas e de outros usuários", async () => {
			await sut.save(
				makeSubscription({
					id: "s-old",
					userId: "user-a",
					billingSubscriptionId: "stripe-old",
					status: "canceled",
				}),
			)
			await sut.save(
				makeSubscription({
					id: "s-other",
					userId: "user-b",
					billingSubscriptionId: "stripe-other",
				}),
			)

			expect(await sut.ofUserId("user-a")).toBeNull()
		})
	})
```

Acrescente ao final de `in-memory-plan-repository.test.ts` (adicione `import { Plan } from "@/subscription/domain/plan"` e `import { InMemoryPlanRepository } from "./in-memory-plan-repository"` se ainda não existirem no arquivo):

```ts
describe("InMemoryPlanRepository.planOfStripePriceId", () => {
	function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
		return Plan.restore({
			id: "plan-1",
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline",
			features: [],
			isActive: true,
			stripePriceId: "price_monthly",
			...overrides,
		})
	}

	it("encontra o plano pelo stripePriceId, inclusive inativo", async () => {
		const sut = new InMemoryPlanRepository()
		await sut.save(makePlan({ isActive: false }))

		const result = await sut.planOfStripePriceId("price_monthly")

		expect(result?.id).toBe("plan-1")
		expect(result?.isActive).toBe(false)
	})

	it("devolve null para price desconhecido e para priceId vazio", async () => {
		const sut = new InMemoryPlanRepository()
		await sut.save(makePlan({ stripePriceId: "" }))

		expect(await sut.planOfStripePriceId("price_unknown")).toBeNull()
		expect(await sut.planOfStripePriceId("")).toBeNull()
	})
})
```

- **Step 3: Write the failing test (integration Prisma)**

No arquivo `prisma-subscription-repository.integration-test.ts`, adicione os imports:

```ts
import { PrismaPlanRepository } from "@/shared/infra/database/repository/prisma/prisma-plan-repository"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
```

e, dentro do `describe("PrismaSubscriptionRepository", ...)` externo (depois do bloco `ofCustomerId`), acrescente:

```ts
	describe("vínculo com plano e período", () => {
		const planIds: string[] = []

		async function createTestPlan(stripePriceId?: string) {
			const id = randomUUID()
			await prismaClient.plan.create({
				data: {
					id,
					name: "Plano teste",
					price_cents: 4990,
					billing_period: "monthly",
					tagline: "tagline",
					features: [],
					stripe_price_id: stripePriceId ?? `price_${id}`,
				},
			})
			planIds.push(id)
			return id
		}

		function makeActive(overrides: { planId?: string; status?: "active" | "canceled" } = {}) {
			return Subscription.create({
				id: randomUUID(),
				userId,
				billingSubscriptionId: `stripe-sub-${randomUUID()}`,
				customerId: `cus-${randomUUID()}`,
				status: overrides.status ?? "active",
				planId: overrides.planId,
				billingPeriod: "monthly",
				currentPeriodStart: new Date("2026-01-31T10:00:00.000Z"),
			})
		}

		afterEach(async () => {
			await prismaClient.subscription.deleteMany({ where: { user_id: userId } })
			await prismaClient.plan.deleteMany({ where: { id: { in: planIds } } })
			planIds.length = 0
		})

		it("grava e restaura planId, período e cancelAtPeriodEnd", async () => {
			const planId = await createTestPlan()
			const subscription = makeActive({ planId })
			await sut.save(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)

			expect(restored?.planId).toBe(planId)
			expect(restored?.currentPeriodStart.toISOString()).toBe(
				"2026-01-31T10:00:00.000Z",
			)
			expect(restored?.currentPeriodEnd.toISOString()).toBe(
				"2026-02-28T10:00:00.000Z",
			)
			expect(restored?.cancelAtPeriodEnd).toBe(false)
		})

		it("update persiste troca de plano e cancelamento agendado", async () => {
			const firstPlanId = await createTestPlan()
			const secondPlanId = await createTestPlan()
			const subscription = makeActive({ planId: firstPlanId })
			await sut.save(subscription)

			subscription.changePlan(secondPlanId)
			subscription.scheduleCancellation()
			await sut.update(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)
			expect(restored?.planId).toBe(secondPlanId)
			expect(restored?.cancelAtPeriodEnd).toBe(true)
		})

		it("aceita linha legada sem plano (plan_id nulo) e a restaura com planId indefinido", async () => {
			const subscription = makeActive()
			await sut.save(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)

			expect(restored).not.toBeNull()
			expect(restored?.planId).toBeUndefined()
		})

		it("ofUserId devolve a assinatura ativa e ignora a cancelada", async () => {
			await sut.save(makeActive({ status: "canceled" }))
			const active = makeActive()
			await sut.save(active)

			const result = await sut.ofUserId(userId)

			expect(result?.id).toBe(active.id)
			expect(await sut.ofUserId(randomUUID())).toBeNull()
		})

		it("o índice parcial aceita uma ativa e uma cancelada do mesmo usuário", async () => {
			await sut.save(makeActive({ status: "canceled" }))

			await expect(sut.save(makeActive())).resolves.toBeUndefined()
		})

		it("o índice parcial rejeita a segunda assinatura ativa do mesmo usuário", async () => {
			await sut.save(makeActive())

			await expect(sut.save(makeActive())).rejects.toBeInstanceOf(
				ActiveSubscriptionAlreadyExistsError,
			)
		})

		it("planOfStripePriceId encontra o plano pelo price e devolve null para vazio", async () => {
			const stripePriceId = `price_${randomUUID()}`
			const planId = await createTestPlan(stripePriceId)
			const planRepository = new PrismaPlanRepository(prismaClient)

			const found = await planRepository.planOfStripePriceId(stripePriceId)

			expect(found?.id).toBe(planId)
			expect(await planRepository.planOfStripePriceId("")).toBeNull()
		})
	})
```

- **Step 4: Review Focus: Duas criações concorrentes para o mesmo usuário → uma vence, a outra falha com conflito pelo índice único, nunca duas ativas — Write the failing test**

No mesmo bloco `describe("vínculo com plano e período", ...)`, acrescente:

```ts
		it("duas criações concorrentes do mesmo usuário: uma vence, a outra falha com conflito, nunca duas ativas", async () => {
			const results = await Promise.allSettled([
				sut.save(makeActive()),
				sut.save(makeActive()),
			])

			const fulfilled = results.filter((r) => r.status === "fulfilled")
			const rejected = results.filter(
				(r): r is PromiseRejectedResult => r.status === "rejected",
			)
			expect(fulfilled).toHaveLength(1)
			expect(rejected).toHaveLength(1)
			expect(rejected[0].reason).toBeInstanceOf(
				ActiveSubscriptionAlreadyExistsError,
			)
			expect(
				await prismaClient.subscription.count({
					where: { user_id: userId, status: "active" },
				}),
			).toBe(1)
		})
```

- **Step 5: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.test.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
Expected: FAIL with "sut.ofUserId is not a function" and "sut.planOfStripePriceId is not a function".

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-subscription-repository.integration-test.ts`
Expected: FAIL: os testes novos falham (coluna `plan_id`/`current_period_start` inexistente no client e `ofUserId`/`planOfStripePriceId` indefinidos); os 4 testes antigos continuam passando.

- **Step 6: Write minimal implementation (contratos e in-memory)**

Em `apps/backend/src/subscription/repository/subscription-repository.ts`, acrescente à interface, depois de `ofCustomerId`:

```ts
	ofUserId(userId: string): Promise<Subscription | null>
```

Em `apps/backend/src/subscription/application/repository/plan-repository.ts`, acrescente à interface, depois de `planOfId`:

```ts
	planOfStripePriceId(priceId: string): Promise<Plan | null>
```

Em `in-memory-subscription-repository.ts`, acrescente:

```ts
	public async ofUserId(userId: string): Promise<Subscription | null> {
		return (
			this.data.find(
				(subscription) =>
					subscription.userId === userId && subscription.status === "active",
			) ?? null
		)
	}
```

Em `in-memory-plan-repository.ts`, acrescente:

```ts
	public async planOfStripePriceId(priceId: string): Promise<Plan | null> {
		if (!priceId) return null
		return this.plans.find((plan) => plan.stripePriceId === priceId) ?? null
	}
```

- **Step 7: Write minimal implementation (schema e migration)**

Em `apps/backend/prisma/schema.prisma`, no `model Subscription`, acrescente os campos e o relation (mantendo o restante):

```prisma
  plan_id              String?  @db.Uuid
  current_period_start DateTime @default(now())
  current_period_end   DateTime @default(now())
  cancel_at_period_end Boolean  @default(false)
  plan                 Plan?    @relation(fields: [plan_id], references: [id], onDelete: Restrict)

  @@index([plan_id])
```

(o `@@index([plan_id])` entra junto dos `@@index`/`@@map` existentes do model). No `model Plan`, acrescente o lado inverso:

```prisma
  subscriptions Subscription[]
```

Crie `apps/backend/prisma/migrations/20260923120000_add_plan_link_to_subscriptions/migration.sql`:

```sql
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
```

Aplique e regenere o client:

Run: `cd apps/backend && pnpm prisma:deploy && pnpm prisma:generate`
Expected: a migration `20260923120000_add_plan_link_to_subscriptions` aparece como aplicada e o client é regenerado sem erro. Se a criação do índice único falhar por já existirem duas linhas ativas do mesmo usuário no banco de desenvolvimento, pare e reporte: não apague dados para contornar.

- **Step 8: Write minimal implementation (repositórios Prisma)**

Substitua `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts` por:

```ts
import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionStatusTypes } from "@/subscription/domain/subscription-status-types"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

const ACTIVE_SUBSCRIPTION_INDEX = "subscriptions_user_id_active_key"

interface SubscriptionData {
	id: string
	user_id: string
	billing_subscription_id: string
	customer_id: string
	status: SubscriptionStatusTypes
	plan_id: string | null
	current_period_start: Date
	current_period_end: Date
	cancel_at_period_end: boolean
	canceled_at: Date | null
	created_at: Date
	updated_at: Date
}

@injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): SubscriptionRepository {
		if (!PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			throw new InvalidTransactionInstance(prismaClient)
		}
		return new PrismaSubscriptionRepository(prismaClient)
	}

	public async save(subscription: Subscription): Promise<void> {
		try {
			await this.prisma.subscription.create({
				data: {
					id: subscription.id,
					user_id: subscription.userId,
					billing_subscription_id: subscription.billingSubscriptionId,
					customer_id: subscription.customerId,
					status: subscription.status,
					plan_id: subscription.planId ?? null,
					current_period_start: subscription.currentPeriodStart,
					current_period_end: subscription.currentPeriodEnd,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
					canceled_at: subscription.canceledAt ?? null,
					created_at: subscription.createdAt,
				},
			})
		} catch (error) {
			if (this.isActiveSubscriptionIndexViolation(error)) {
				throw new ActiveSubscriptionAlreadyExistsError({ cause: error })
			}
			throw error
		}
	}

	public async update(subscription: Subscription): Promise<void> {
		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				status: subscription.status,
				plan_id: subscription.planId ?? null,
				cancel_at_period_end: subscription.cancelAtPeriodEnd,
				canceled_at: subscription.canceledAt ?? null,
				updated_at: subscription.updatedAt ?? new Date(),
			},
		})
	}

	public async ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findUnique({
			where: { billing_subscription_id: billingSubscriptionId },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	public async ofCustomerId(customerId: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findFirst({
			where: { customer_id: customerId },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findFirst({
			where: { user_id: userId, status: "active" },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	private isActiveSubscriptionIndexViolation(error: unknown): boolean {
		return (
			error instanceof Error && error.message.includes(ACTIVE_SUBSCRIPTION_INDEX)
		)
	}

	private restore(data: SubscriptionData): Subscription {
		return Subscription.restore({
			id: data.id,
			userId: data.user_id,
			billingSubscriptionId: data.billing_subscription_id,
			customerId: data.customer_id,
			status: data.status,
			planId: data.plan_id ?? undefined,
			currentPeriodStart: data.current_period_start,
			currentPeriodEnd: data.current_period_end,
			cancelAtPeriodEnd: data.cancel_at_period_end,
			canceledAt: data.canceled_at ?? undefined,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
		})
	}
}
```

Se, ao rodar o Step 9, o teste "rejeita a segunda assinatura ativa" falhar porque o erro lançado pelo Prisma não traz o nome do índice em `error.message`, leia a saída da falha para ver onde o nome do constraint aparece (`error.cause`, `error.meta`) e ajuste somente `isActiveSubscriptionIndexViolation` para ler essa propriedade; não capture erros de outra origem (ex.: violação de `billing_subscription_id`) nem os engula.

Em `prisma-plan-repository.ts`, acrescente depois de `planOfId`:

```ts
	public async planOfStripePriceId(priceId: string): Promise<Plan | null> {
		if (!priceId) return null
		const row = await this.prismaClient.plan.findFirst({
			where: { stripe_price_id: priceId },
		})
		if (!row) return null
		return this.createPlan(row)
	}
```

- **Step 9: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.test.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
Expected: PASS.

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-subscription-repository.integration-test.ts`
Expected: PASS (os 4 testes antigos mais os novos).

- **Step 10: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/prisma apps/backend/src
git commit -m "feat(subscription): persist plan link and enforce one active subscription per user"
```

## Critérios de Sucesso

- Uma assinatura salva com plano e período é restaurada com os mesmos `planId`, `currentPeriodStart`, `currentPeriodEnd` e `cancelAtPeriodEnd` (FR-001).
- O banco rejeita a segunda assinatura ativa do mesmo usuário e aceita ativa + cancelada; duas `save` concorrentes resultam em exatamente uma linha ativa e um `ActiveSubscriptionAlreadyExistsError` (FR-004).
- `ofUserId` devolve só a linha `active` do usuário; `planOfStripePriceId` devolve o plano (ativo ou inativo) e `null` para vazio ou desconhecido.
- Linhas legadas com `plan_id` nulo continuam consultáveis, com período preenchido pelo backfill.
