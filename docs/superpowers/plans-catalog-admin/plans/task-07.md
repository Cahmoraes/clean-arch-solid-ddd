# Task 7: Listar todos os planos (admin) — use case + `GET /admin/plans` [FR-009, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-03

## Visão Geral

`ListPlansAdminUseCase` retorna todos os planos, ativos e inativos, para que o admin tenha visão
completa do catálogo (FR-009). `ListPlansAdminController` expõe `GET /admin/plans` — mesmo path
base de `POST /admin/plans` (task-04), método diferente — protegido `onlyAdmin` (FR-012). Cada
plano no corpo da resposta inclui `isActive`, para que o frontend (task-10) renderize o selo de
status (Ativo/Inativo) sem uma segunda chamada.

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.ts`
- Create: `apps/backend/src/subscription/infra/controller/admin/list-plans-admin.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`
- Test: `apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.test.ts`

## Interfaces

- **Consome:** `PlanRepository.fetchPlans(): Promise<Plan[]>` (task-03); `Plan` getters (task-01);
  `SubscriptionRoutes.ADMIN_PLANS` (task-04, mesmo path, método `GET`).
- **Produz:** `ListPlansAdminUseCase.execute(): Promise<Plan[]>`. `ListPlansAdminController` (rota
  `GET /admin/plans`, `isProtected: true, onlyAdmin: true`).
  `SUBSCRIPTION_TYPES.USE_CASES.ListPlansAdmin = Symbol.for("ListPlansAdminUseCase")`,
  `SUBSCRIPTION_TYPES.CONTROLLERS.ListPlansAdmin = Symbol.for("ListPlansAdminController")`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de use case/controller backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (padrão de Use Case de listagem, análogo a
  `FetchUsersUseCase`).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { Plan } from "@/subscription/domain/plan"
import { ListPlansAdminUseCase } from "./list-plans-admin.usecase"

describe("ListPlansAdminUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ListPlansAdminUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ListPlansAdminUseCase(planRepository)
	})

	test("deve retornar todos os planos, ativos e inativos", async () => {
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

		expect(result).toHaveLength(2)
		expect(result.map((plan) => plan.isActive).sort()).toEqual([false, true])
	})

	test("deve retornar lista vazia quando não há planos cadastrados", async () => {
		const result = await sut.execute()

		expect(result).toEqual([])
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/list-plans-admin.usecase.test.ts`
Expected: FAIL — `Cannot find module './list-plans-admin.usecase'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.ts
import { inject, injectable } from "inversify"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import type { PlanRepository } from "../repository/plan-repository"

@injectable()
export class ListPlansAdminUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(): Promise<Plan[]> {
		return this.planRepository.fetchPlans()
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/list-plans-admin.usecase.test.ts`
Expected: PASS

- **Step 3: Write minimal implementation** *(controller e wiring — sem teste dedicado nesta task;
  a autorização `onlyAdmin` já está coberta pelo padrão validado em
  `create-plan.authorization.business-flow-test.ts` da task-04)*

```typescript
// apps/backend/src/subscription/infra/controller/admin/list-plans-admin.controller.ts
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { ListPlansAdminUseCase } from "@/subscription/application/use-case/list-plans-admin.usecase"
import { BILLING_PERIODS } from "@/subscription/domain/plan"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

@injectable()
export class ListPlansAdminController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ListPlansAdmin)
		private readonly listPlansAdmin: ListPlansAdminUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"get",
			SubscriptionRoutes.ADMIN_PLANS,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeListPlansAdminSwaggerSchema(),
		)
	}

	private async callback() {
		const plans = await this.listPlansAdmin.execute()
		return ResponseFactory.OK({
			body: plans.map((plan) => ({
				id: plan.id,
				name: plan.name,
				priceCents: plan.priceCents,
				billingPeriod: plan.billingPeriod,
				tagline: plan.tagline,
				features: plan.features,
				isActive: plan.isActive,
				stripePriceId: plan.stripePriceId,
			})),
		})
	}
}

function makeListPlansAdminSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "List all plans",
		description:
			"List every plan, active and inactive. Requires ADMIN role",
		security: true,
		responses: {
			200: {
				description: "Plans listed successfully",
				schema: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						priceCents: z.number(),
						billingPeriod: z.enum(BILLING_PERIODS),
						tagline: z.string(),
						features: z.array(z.string()),
						isActive: z.boolean(),
						stripePriceId: z.string(),
					}),
				),
			},
		},
	})
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts — dentro de USE_CASES e CONTROLLERS
USE_CASES: {
	// ...existentes
	ListPlansAdmin: Symbol.for("ListPlansAdminUseCase"),
},
CONTROLLERS: {
	// ...existentes
	ListPlansAdmin: Symbol.for("ListPlansAdminController"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
import { ListPlansAdminUseCase } from "@/subscription/application/use-case/list-plans-admin.usecase"
import { ListPlansAdminController } from "@/subscription/infra/controller/admin/list-plans-admin.controller"

bind(SUBSCRIPTION_TYPES.USE_CASES.ListPlansAdmin).to(ListPlansAdminUseCase)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlansAdmin).to(ListPlansAdminController)
```

```typescript
// apps/backend/src/bootstrap/setup-subscription-module.ts
const controllers = [
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateSubscription),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.UpdatePlan),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.InactivatePlan),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ReactivatePlan),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlansAdmin),
]
```

- **Step 4: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.ts \
  apps/backend/src/subscription/application/use-case/list-plans-admin.usecase.test.ts \
  apps/backend/src/subscription/infra/controller/admin/list-plans-admin.controller.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts \
  apps/backend/src/bootstrap/setup-subscription-module.ts
git commit -m "feat(subscription): add ListPlansAdminUseCase and GET /admin/plans"
```

## Critérios de Sucesso

- `ListPlansAdminUseCase.execute()` retorna todos os planos cadastrados, ativos e inativos, e uma
  lista vazia quando não há nenhum (FR-009).
- `GET /admin/plans` é registrada com `isProtected: true, onlyAdmin: true` (FR-012) e cada item da
  resposta inclui `isActive` para indicação visual de status no admin.
