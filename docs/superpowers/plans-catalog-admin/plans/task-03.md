# Task 3: `PlanRepository` (interface, Prisma, InMemory) [FR-001, FR-004, FR-006, FR-007, FR-009, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

Cria a interface `PlanRepository` e suas duas implementações (`PrismaPlanRepository`,
`InMemoryPlanRepository`), seguindo exatamente o padrão já usado por `GymRepository`/
`SubscriptionRepository`: `save`, `update`, busca por id, e duas listagens — `fetchPlans()`
(todos os planos, uso administrativo) e `fetchActivePlans()` (só `isActive: true`, uso público) —
espelhando a decisão D3 da spec de manter as duas superfícies de leitura desacopladas desde a
camada de repositório. Também adiciona `PlanNotFoundError` e conecta tudo ao IoC (novo
identificador em `SUBSCRIPTION_TYPES.REPOSITORIES.Plan`, provider, bind no módulo).

## Arquivos

- Create: `apps/backend/src/subscription/application/repository/plan-repository.ts`
- Create: `apps/backend/src/subscription/application/error/plan-not-found-error.ts`
- Create: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/subscription/plan-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`

## Interfaces

- **Consome:** `Plan.create/.restore/.inactivate/.reactivate`, getters `id, name, priceCents,
  billingPeriod, tagline, features, isActive, stripePriceId` (task-01, `plan.ts`); `model Plan`
  do `schema.prisma` (`price_cents, billing_period, is_active, stripe_price_id`, task-02).
- **Produz:** interface `PlanRepository` (`apps/backend/src/subscription/application/repository/
  plan-repository.ts`): `save(plan: Plan): Promise<{ id: string }>`, `update(plan: Plan):
  Promise<void>`, `planOfId(id: string): Promise<Plan | null>`, `fetchPlans(): Promise<Plan[]>`
  (admin, todos), `fetchActivePlans(): Promise<Plan[]>` (público, só ativos),
  `withTransaction<TX extends object>(tx: TX): PlanRepository`. `PrismaPlanRepository`,
  `InMemoryPlanRepository` — ambas implementam `PlanRepository`. `PlanNotFoundError` (kind
  `"not-found"`, `apps/backend/src/subscription/application/error/plan-not-found-error.ts`).
  `PlanRepositoryProvider.provide(context: ResolutionContext): PlanRepository`.
  `SUBSCRIPTION_TYPES.REPOSITORIES.Plan = Symbol.for("PlanRepository")`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de repositório/IoC backend, sem UI; segue
  as convenções de `apps/backend/AGENTS.md` (seções "Padrão de repositório", "Inversify IoC").

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { Plan } from "@/subscription/domain/plan"
import { InMemoryPlanRepository } from "./in-memory-plan-repository"

function makePlan(overrides: Partial<Parameters<typeof Plan.create>[0]> = {}) {
	return Plan.create({
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Acesso ilimitado.",
		features: ["Check-ins ilimitados"],
		...overrides,
	}).forceSuccess().value
}

describe("InMemoryPlanRepository", () => {
	let sut: InMemoryPlanRepository

	beforeEach(() => {
		sut = new InMemoryPlanRepository()
	})

	test("deve salvar e buscar um plano por id", async () => {
		const plan = makePlan()

		await sut.save(plan)
		const found = await sut.planOfId(plan.id)

		expect(found).not.toBeNull()
		expect(found?.id).toBe(plan.id)
		expect(found?.name).toBe("Premium Mensal")
	})

	test("planOfId retorna null quando o plano não existe", async () => {
		const found = await sut.planOfId("id-inexistente")

		expect(found).toBeNull()
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
Expected: FAIL — `Cannot find module './in-memory-plan-repository'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/repository/plan-repository.ts
import type { Plan } from "@/subscription/domain/plan"

export interface SavePlanResult {
	id: string
}

export interface PlanRepository {
	save(plan: Plan): Promise<SavePlanResult>
	update(plan: Plan): Promise<void>
	planOfId(id: string): Promise<Plan | null>
	fetchPlans(): Promise<Plan[]>
	fetchActivePlans(): Promise<Plan[]>
	withTransaction<TX extends object>(tx: TX): PlanRepository
}
```

```typescript
// apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.ts
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import { Plan } from "@/subscription/domain/plan"

@injectable()
export class InMemoryPlanRepository implements PlanRepository {
	public plans = new ExtendedSet<Plan>()

	public withTransaction(): PlanRepository {
		return this
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		this.plans.add(plan)
		return { id: plan.id }
	}

	public async update(plan: Plan): Promise<void> {
		const existing = this.plans.find((current) => current.id === plan.id)
		if (existing) this.plans.delete(existing)
		this.plans.add(plan)
	}

	public async planOfId(id: string): Promise<Plan | null> {
		return this.plans.find((plan) => plan.id === id) ?? null
	}

	public async fetchPlans(): Promise<Plan[]> {
		return this.plans.toArray()
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		return this.plans.filter((plan) => plan.isActive).toArray()
	}
}
```

```typescript
// apps/backend/src/subscription/application/error/plan-not-found-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class PlanNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan not found", errorOptions)
		this.name = "PlanNotFoundError"
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
test("fetchActivePlans retorna apenas planos com isActive true", async () => {
	const active = makePlan({ name: "Ativo" })
	const inactive = makePlan({ name: "Inativo" }).inactivate()
	await sut.save(active)
	await sut.save(inactive)

	const result = await sut.fetchActivePlans()

	expect(result).toHaveLength(1)
	expect(result[0]?.name).toBe("Ativo")
})

test("fetchPlans retorna todos os planos, ativos e inativos", async () => {
	const active = makePlan({ name: "Ativo" })
	const inactive = makePlan({ name: "Inativo" }).inactivate()
	await sut.save(active)
	await sut.save(inactive)

	const result = await sut.fetchPlans()

	expect(result).toHaveLength(2)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts`
Expected: PASS — `fetchActivePlans`/`fetchPlans` já foram implementados no Step 2; este passo
confirma o comportamento de filtro por `isActive` explicitamente antes de seguir para a
implementação Prisma

- **Step 4: Write minimal implementation** *(sem teste dedicado nesta task — `PrismaPlanRepository`
  espelha exatamente `PrismaGymRepository`, cuja correção de wiring é validada pelo checkpoint de
  typecheck/build do lote, não por um passo de teste unitário aqui)*

```typescript
// apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.ts
import { inject, injectable } from "inversify"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"
import {
	Prisma,
	type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { PrismaUnitOfWork } from "../unit-of-work/prisma-unit-of-work"

export interface PlanRow {
	id: string
	name: string
	price_cents: number
	billing_period: string
	tagline: string
	features: string[]
	is_active: boolean
	stripe_price_id: string | null
}

@injectable()
export class PrismaPlanRepository implements PlanRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(prismaClient: TX): PlanRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaPlanRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		const result = await this.prismaClient.plan.create({
			data: {
				id: plan.id,
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
			},
			select: { id: true },
		})
		return { id: result.id }
	}

	public async update(plan: Plan): Promise<void> {
		await this.prismaClient.plan.update({
			where: { id: plan.id },
			data: {
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
			},
		})
	}

	public async planOfId(id: string): Promise<Plan | null> {
		const row = await this.prismaClient.plan.findUnique({ where: { id } })
		if (!row) return null
		return this.createPlan(row)
	}

	public async fetchPlans(): Promise<Plan[]> {
		const rows = await this.prismaClient.plan.findMany()
		return rows.map((row) => this.createPlan(row))
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		const rows = await this.prismaClient.plan.findMany({
			where: { is_active: true },
		})
		return rows.map((row) => this.createPlan(row))
	}

	private createPlan(row: PlanRow): Plan {
		return Plan.restore({
			id: row.id,
			name: row.name,
			priceCents: row.price_cents,
			billingPeriod: row.billing_period as BillingPeriod,
			tagline: row.tagline,
			features: row.features,
			isActive: row.is_active,
			stripePriceId: row.stripe_price_id ?? "",
		})
	}
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/plan-repository-provider.ts
import type { ResolutionContext } from "inversify"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { PrismaPlanRepository } from "@/shared/infra/database/repository/prisma/prisma-plan-repository"
import { isProduction } from "@/shared/infra/env"
import type { PlanRepository } from "@/subscription/application/repository/plan-repository"

export class PlanRepositoryProvider {
	public static provide(context: ResolutionContext): PlanRepository {
		return isProduction()
			? context.get(PrismaPlanRepository, { autobind: true })
			: context.get(InMemoryPlanRepository, { autobind: true })
	}
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts — dentro de REPOSITORIES
REPOSITORIES: {
	Subscription: Symbol.for("SubscriptionRepository"),
	StripeWebhookEvent: Symbol.for("StripeWebhookEventRepository"),
	Plan: Symbol.for("PlanRepository"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts — dentro do ContainerModule, junto dos demais binds de REPOSITORIES
import { PlanRepositoryProvider } from "./plan-repository-provider"

bind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
	.toDynamicValue(PlanRepositoryProvider.provide)
	.inSingletonScope()
```

- **Step 5: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/repository/plan-repository.ts \
  apps/backend/src/subscription/application/error/plan-not-found-error.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.test.ts \
  apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/plan-repository-provider.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
git commit -m "feat(subscription): add PlanRepository and its Prisma/InMemory implementations"
```

## Critérios de Sucesso

- `InMemoryPlanRepository.save`/`.planOfId` persistem e recuperam um `Plan` por id; id inexistente
  retorna `null` (FR-001, FR-009).
- `fetchActivePlans()` retorna somente planos com `isActive: true`; `fetchPlans()` retorna todos,
  ativos e inativos (FR-009, FR-010).
- `PrismaPlanRepository` implementa o mesmo contrato de `PlanRepository`, mapeando `price_cents`/
  `billing_period`/`is_active`/`stripe_price_id` entre `Plan` e a tabela `plans` (FR-004, FR-006,
  FR-007).
- `SUBSCRIPTION_TYPES.REPOSITORIES.Plan` resolve para `PrismaPlanRepository` em produção e
  `InMemoryPlanRepository` fora dela, via `PlanRepositoryProvider`.
