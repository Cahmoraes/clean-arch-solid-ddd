# Task 8: Listar planos ativos (público) — use case + refatorar `GET /plans` [FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-03

## Visão Geral

`ListActivePlansUseCase` retorna somente planos com `isActive: true` — a home e `/assinatura`
nunca devem ver planos descontinuados (FR-010). `ListPlansController` (rota pública `GET /plans`,
já existente) passa a usar esse use case em vez do array estático `DEMO_PLANS`, preservando
**exatamente** o contrato de resposta já consumido hoje: `{ id, name, priceId, priceLabel,
tagline, features[] }[]` (FR-011, Restrição Global do índice de tasks) — `priceId` vem de
`Plan.stripePriceId` (`""` quando o admin não preencheu) e `priceLabel` é computado a partir de
`priceCents`/`billingPeriod` na serialização (Decisão D2 da spec). Quando todos os planos estão
inativos, a rota retorna uma lista vazia, nunca um erro (Review Focus desta task). O array
estático `DEMO_PLANS`/`DemoPlan` e o antigo `ListPlansUseCase` são removidos — o backend não tem
mais nenhuma fonte de planos hardcoded.

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/list-active-plans.usecase.ts`
- Modify: `apps/backend/src/subscription/infra/controller/list-plans.controller.ts`
- Modify: `apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Delete: `apps/backend/src/subscription/domain/plans.ts`
- Delete: `apps/backend/src/subscription/application/use-case/list-plans.usecase.ts`
- Test: `apps/backend/src/subscription/application/use-case/list-active-plans.usecase.test.ts`

## Interfaces

- **Consome:** `PlanRepository.fetchActivePlans(): Promise<Plan[]>` (task-03); `Plan` getters
  `id, name, priceCents, billingPeriod, tagline, features, stripePriceId` (task-01);
  `SubscriptionRoutes.PLANS` (já existente, inalterada).
- **Produz:** `ListActivePlansUseCase.execute(): Promise<Plan[]>`. `ListPlansController` editado
  para mapear `Plan[]` → `{ id, name, priceId, priceLabel, tagline, features }[]` na rota pública
  `GET /plans`. `SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans = Symbol.for
  ("ListActivePlansUseCase")` (substitui o antigo `USE_CASES.ListPlans`, que é removido).

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de use case/controller backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (padrão de Use Case de listagem filtrada).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/list-active-plans.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { Plan } from "@/subscription/domain/plan"
import { ListActivePlansUseCase } from "./list-active-plans.usecase"

describe("ListActivePlansUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ListActivePlansUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ListActivePlansUseCase(planRepository)
	})

	test("deve retornar apenas planos ativos", async () => {
		const active = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		const inactive = Plan.create({
			name: "Premium Anual",
			priceCents: 47900,
			billingPeriod: "yearly",
			tagline: "Tagline anual.",
			features: ["Tudo do mensal"],
		}).forceSuccess().value.inactivate()
		await planRepository.save(active)
		await planRepository.save(inactive)

		const result = await sut.execute()

		expect(result).toHaveLength(1)
		expect(result[0]?.name).toBe("Premium Mensal")
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/list-active-plans.usecase.test.ts`
Expected: FAIL — `Cannot find module './list-active-plans.usecase'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/list-active-plans.usecase.ts
import { inject, injectable } from "inversify"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import type { PlanRepository } from "../repository/plan-repository"

@injectable()
export class ListActivePlansUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(): Promise<Plan[]> {
		return this.planRepository.fetchActivePlans()
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/list-active-plans.usecase.test.ts`
Expected: PASS

- **Step 3: Review Focus: GET /plans com todos os planos inativos retorna uma lista vazia, não um erro — Write the failing test**

```typescript
// apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts — substitui o arquivo inteiro
import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Plan } from "@/subscription/domain/plan"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { SubscriptionRoutes } from "./routes/subscription-routes"

describe("GET /plans", () => {
	let fastifyServer: FastifyAdapter
	let planRepository: InMemoryPlanRepository

	beforeEach(async () => {
		container.snapshot()
		planRepository = new InMemoryPlanRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("retorna array de planos ativos com shape correto", async () => {
		const plan = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Acesso ilimitado a todas as academias parceiras.",
			features: ["Check-ins ilimitados"],
			stripePriceId: "price_demo_monthly",
		}).forceSuccess().value
		await planRepository.save(plan)

		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.PLANS,
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body as unknown[]).toBeInstanceOf(Array)
		expect((response.body as unknown[]).length).toBeGreaterThan(0)
		expect((response.body as unknown[])[0]).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			priceId: expect.any(String),
			priceLabel: expect.any(String),
			tagline: expect.any(String),
			features: expect.any(Array),
		})
	})

	test("com todos os planos inativos retorna 200 e lista vazia, não um erro", async () => {
		const inactive = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value.inactivate()
		await planRepository.save(inactive)

		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.PLANS,
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual([])
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/list-plans.business-flow-test.ts`
Expected: FAIL — `SUBSCRIPTION_TYPES.REPOSITORIES.Plan` ainda não é consumido por
`ListPlansController` (ele ainda usa o antigo `ListPlansUseCase`/`DEMO_PLANS`), então o primeiro
teste recebe o array estático de 2 planos hardcoded em vez do plano semeado no teste, e o segundo
teste recebe `DEMO_PLANS` (não vazio) em vez de `[]`

- **Step 4: Write minimal implementation**

```typescript
// apps/backend/src/subscription/infra/controller/list-plans.controller.ts — arquivo inteiro
import { inject, injectable } from "inversify"
import type { BillingPeriod, Plan } from "@/subscription/domain/plan"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { ListActivePlansUseCase } from "../../application/use-case/list-active-plans.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
	monthly: "mês",
	yearly: "ano",
}

function formatPriceLabel(priceCents: number, billingPeriod: BillingPeriod): string {
	const amount = (priceCents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
	return `R$ ${amount}/${BILLING_PERIOD_LABEL[billingPeriod]}`
}

function toPublicPlan(plan: Plan) {
	return {
		id: plan.id,
		name: plan.name,
		priceId: plan.stripePriceId,
		priceLabel: formatPriceLabel(plan.priceCents, plan.billingPeriod),
		tagline: plan.tagline,
		features: plan.features,
	}
}

@injectable()
export class ListPlansController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans)
		private readonly listActivePlans: ListActivePlansUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		await this.server.register("get", SubscriptionRoutes.PLANS, {
			callback: this.callback,
			rateLimit: { max: 100, timeWindow: 60_000 },
		})
	}

	private async callback() {
		const plans = await this.listActivePlans.execute()
		return ResponseFactory.OK({ body: plans.map(toPublicPlan) })
	}
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts — dentro de USE_CASES, remove ListPlans e adiciona ListActivePlans
USE_CASES: {
	CreateCustomer: Symbol.for("CreateCustomerSubscriptionUseCase"),
	CreateSubscription: Symbol.for("CreateSubscriptionUseCase"),
	ActivateSubscription: Symbol.for("ActivateSubscriptionUseCase"),
	CancelSubscription: Symbol.for("CancelSubscriptionUseCase"),
	HandlePaymentFailed: Symbol.for("HandlePaymentFailedUseCase"),
	ListActivePlans: Symbol.for("ListActivePlansUseCase"),
	CreatePlan: Symbol.for("CreatePlanUseCase"),
	UpdatePlan: Symbol.for("UpdatePlanUseCase"),
	InactivatePlan: Symbol.for("InactivatePlanUseCase"),
	ReactivatePlan: Symbol.for("ReactivatePlanUseCase"),
	ListPlansAdmin: Symbol.for("ListPlansAdminUseCase"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
// remove: import { ListPlansUseCase } from "@/subscription/application/use-case/list-plans.usecase"
// remove: bind(SUBSCRIPTION_TYPES.USE_CASES.ListPlans).to(ListPlansUseCase)
import { ListActivePlansUseCase } from "@/subscription/application/use-case/list-active-plans.usecase"

bind(SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans).to(ListActivePlansUseCase)
// CONTROLLERS.ListPlans continua ligado a ListPlansController — inalterado, o controller apenas
// passou a injetar SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans
```

Delete `apps/backend/src/subscription/domain/plans.ts` e
`apps/backend/src/subscription/application/use-case/list-plans.usecase.ts` — nenhum arquivo do
backend importa mais `DEMO_PLANS`/`DemoPlan`/`ListPlansUseCase` depois desta mudança.

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/list-plans.business-flow-test.ts`
Expected: PASS

- **Step 5: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/use-case/list-active-plans.usecase.ts \
  apps/backend/src/subscription/application/use-case/list-active-plans.usecase.test.ts \
  apps/backend/src/subscription/infra/controller/list-plans.controller.ts \
  apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
git rm apps/backend/src/subscription/domain/plans.ts \
  apps/backend/src/subscription/application/use-case/list-plans.usecase.ts
git commit -m "refactor(subscription): read GET /plans from the database, remove DEMO_PLANS"
```

## Critérios de Sucesso

- `ListActivePlansUseCase.execute()` retorna somente planos com `isActive: true` (FR-010).
- `GET /plans` preserva exatamente o contrato `{ id, name, priceId, priceLabel, tagline,
  features[] }[]` já consumido por `/assinatura` e pela home (FR-011).
- Com todos os planos inativos (ou nenhum plano cadastrado), `GET /plans` retorna `200` e `[]`,
  nunca um erro (Review Focus).
- `DEMO_PLANS`/`DemoPlan` e o antigo `ListPlansUseCase` deixam de existir no backend.
