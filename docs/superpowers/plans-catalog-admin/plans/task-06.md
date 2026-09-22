# Task 6: Inativar/reativar plano — use cases + `PATCH /admin/plans/:id/inactivate` e `/reactivate` [FR-006, FR-007, FR-008, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-03

## Visão Geral

Inativar e reativar são a mesma forma mecânica de operação — alternar `isActive` sem apagar o
registro (Decisão D4, FR-008) — por isso esta task consolida os dois use cases e os dois
controllers (Case 1 de `task-decomposition-granularity.md`, já decidido no índice de tasks).
`InactivatePlanUseCase` remove o plano da listagem pública sem apagar seus dados (FR-006);
`ReactivatePlanUseCase` reverte isso (FR-007). Ambas as rotas são `PATCH`, protegidas `onlyAdmin`
(FR-012).

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.ts`
- Create: `apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.ts`
- Create: `apps/backend/src/subscription/infra/controller/admin/inactivate-plan.controller.ts`
- Create: `apps/backend/src/subscription/infra/controller/admin/reactivate-plan.controller.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`
- Test: `apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.test.ts`
- Test: `apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.test.ts`

## Interfaces

- **Consome:** `PlanRepository.planOfId`/`.update` (task-03); `Plan.inactivate()`/`.reactivate()`
  (task-01); `PlanNotFoundError` (task-03); `SubscriptionRoutes.ADMIN_PLANS` (task-04, base para
  `/admin/plans/:id/inactivate` e `/reactivate`).
- **Produz:** `InactivatePlanUseCase.execute(id: string): Promise<Either<PlanNotFoundError, Plan>>`,
  `ReactivatePlanUseCase.execute(id: string): Promise<Either<PlanNotFoundError, Plan>>`.
  `InactivatePlanController` (rota `PATCH /admin/plans/:id/inactivate`), `ReactivatePlanController`
  (rota `PATCH /admin/plans/:id/reactivate`) — ambas `isProtected: true, onlyAdmin: true`.
  `SUBSCRIPTION_TYPES.USE_CASES.InactivatePlan/ReactivatePlan`,
  `SUBSCRIPTION_TYPES.CONTROLLERS.InactivatePlan/ReactivatePlan`.
  `SubscriptionRoutes.ADMIN_PLAN_INACTIVATE = "/admin/plans/:id/inactivate"`,
  `SubscriptionRoutes.ADMIN_PLAN_REACTIVATE = "/admin/plans/:id/reactivate"`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de use case/controller backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (padrão de Use Case, soft delete via toggle de
  estado, análogo a `SuspendUserUseCase`/`ActiveUserUseCase`).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { PlanNotFoundError } from "@/subscription/application/error/plan-not-found-error"
import { Plan } from "@/subscription/domain/plan"
import { InactivatePlanUseCase } from "./inactivate-plan.usecase"

describe("InactivatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: InactivatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new InactivatePlanUseCase(planRepository)
	})

	test("deve inativar um plano existente sem apagar seus dados", async () => {
		const plan = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(plan)

		const result = await sut.execute(plan.id)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.isActive).toBe(false)
		const stillPersisted = await planRepository.planOfId(plan.id)
		expect(stillPersisted).not.toBeNull()
		expect(stillPersisted?.name).toBe("Premium Mensal")
	})

	test("deve retornar PlanNotFoundError para um id inexistente", async () => {
		const result = await sut.execute("id-inexistente")

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/inactivate-plan.usecase.test.ts`
Expected: FAIL — `Cannot find module './inactivate-plan.usecase'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export type InactivatePlanUseCaseOutput = Either<PlanNotFoundError, Plan>

@injectable()
export class InactivatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(id: string): Promise<InactivatePlanUseCaseOutput> {
		const existing = await this.planRepository.planOfId(id)
		if (!existing) return failure(new PlanNotFoundError())

		const inactivated = existing.inactivate()
		await this.planRepository.update(inactivated)
		return success(inactivated)
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/inactivate-plan.usecase.test.ts`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { PlanNotFoundError } from "@/subscription/application/error/plan-not-found-error"
import { Plan } from "@/subscription/domain/plan"
import { ReactivatePlanUseCase } from "./reactivate-plan.usecase"

describe("ReactivatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: ReactivatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new ReactivatePlanUseCase(planRepository)
	})

	test("deve reativar um plano previamente inativado", async () => {
		const inactivated = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value.inactivate()
		await planRepository.save(inactivated)

		const result = await sut.execute(inactivated.id)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.isActive).toBe(true)
	})

	test("deve retornar PlanNotFoundError para um id inexistente", async () => {
		const result = await sut.execute("id-inexistente")

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/reactivate-plan.usecase.test.ts`
Expected: FAIL — `Cannot find module './reactivate-plan.usecase'`

- **Step 4: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { Plan } from "@/subscription/domain/plan"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export type ReactivatePlanUseCaseOutput = Either<PlanNotFoundError, Plan>

@injectable()
export class ReactivatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(id: string): Promise<ReactivatePlanUseCaseOutput> {
		const existing = await this.planRepository.planOfId(id)
		if (!existing) return failure(new PlanNotFoundError())

		const reactivated = existing.reactivate()
		await this.planRepository.update(reactivated)
		return success(reactivated)
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/reactivate-plan.usecase.test.ts`
Expected: PASS

- **Step 5: Write minimal implementation** *(controllers e wiring — sem teste dedicado nesta
  task; o comportamento de negócio já está coberto pelos Steps 1-4, e a autorização `onlyAdmin`
  já está coberta pelo padrão validado em `create-plan.authorization.business-flow-test.ts` da
  task-04)*

```typescript
// apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts
const WEBHOOK_PREFIX = "/webhook"
const SUBSCRIPTION_PREFIX = "/subscriptions"
const ADMIN_PLANS_PREFIX = "/admin/plans"

export const SubscriptionRoutes = {
	STRIPE_WEBHOOK: `${WEBHOOK_PREFIX}/stripe`,
	CREATE: SUBSCRIPTION_PREFIX,
	PLANS: "/plans",
	ADMIN_PLANS: ADMIN_PLANS_PREFIX,
	ADMIN_PLAN_BY_ID: `${ADMIN_PLANS_PREFIX}/:id`,
	ADMIN_PLAN_INACTIVATE: `${ADMIN_PLANS_PREFIX}/:id/inactivate`,
	ADMIN_PLAN_REACTIVATE: `${ADMIN_PLANS_PREFIX}/:id/reactivate`,
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
```

```typescript
// apps/backend/src/subscription/infra/controller/admin/inactivate-plan.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { InactivatePlanUseCase } from "@/subscription/application/use-case/inactivate-plan.usecase"
import { BILLING_PERIODS } from "@/subscription/domain/plan"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const inactivatePlanParamsSchema = z.object({
	id: z.string().min(1).meta({ description: "Plan ID" }),
})

@injectable()
export class InactivatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.InactivatePlan)
		private readonly inactivatePlan: InactivatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"patch",
			SubscriptionRoutes.ADMIN_PLAN_INACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeInactivatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			inactivatePlanParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const result = await this.inactivatePlan.execute(parsedParamsOrError.value.id)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const plan = result.value
		return {
			status: HTTP_STATUS.OK,
			body: {
				id: plan.id,
				name: plan.name,
				priceCents: plan.priceCents,
				billingPeriod: plan.billingPeriod,
				tagline: plan.tagline,
				features: plan.features,
				isActive: plan.isActive,
				stripePriceId: plan.stripePriceId,
			},
		}
	}
}

function makeInactivatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Inactivate a plan",
		description:
			"Marks a plan as inactive (soft delete). Requires ADMIN role",
		security: true,
		params: inactivatePlanParamsSchema,
		responses: {
			200: {
				description: "Plan inactivated successfully",
				schema: z.object({
					id: z.string(),
					name: z.string(),
					priceCents: z.number(),
					billingPeriod: z.enum(BILLING_PERIODS),
					tagline: z.string(),
					features: z.array(z.string()),
					isActive: z.boolean(),
					stripePriceId: z.string(),
				}),
			},
			404: {
				description: "Plan not found",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

```typescript
// apps/backend/src/subscription/infra/controller/admin/reactivate-plan.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { ReactivatePlanUseCase } from "@/subscription/application/use-case/reactivate-plan.usecase"
import { BILLING_PERIODS } from "@/subscription/domain/plan"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const reactivatePlanParamsSchema = z.object({
	id: z.string().min(1).meta({ description: "Plan ID" }),
})

@injectable()
export class ReactivatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ReactivatePlan)
		private readonly reactivatePlan: ReactivatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"patch",
			SubscriptionRoutes.ADMIN_PLAN_REACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeReactivatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			reactivatePlanParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const result = await this.reactivatePlan.execute(parsedParamsOrError.value.id)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const plan = result.value
		return {
			status: HTTP_STATUS.OK,
			body: {
				id: plan.id,
				name: plan.name,
				priceCents: plan.priceCents,
				billingPeriod: plan.billingPeriod,
				tagline: plan.tagline,
				features: plan.features,
				isActive: plan.isActive,
				stripePriceId: plan.stripePriceId,
			},
		}
	}
}

function makeReactivatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Reactivate a plan",
		description: "Marks a previously inactivated plan as active. Requires ADMIN role",
		security: true,
		params: reactivatePlanParamsSchema,
		responses: {
			200: {
				description: "Plan reactivated successfully",
				schema: z.object({
					id: z.string(),
					name: z.string(),
					priceCents: z.number(),
					billingPeriod: z.enum(BILLING_PERIODS),
					tagline: z.string(),
					features: z.array(z.string()),
					isActive: z.boolean(),
					stripePriceId: z.string(),
				}),
			},
			404: {
				description: "Plan not found",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts — dentro de USE_CASES e CONTROLLERS
USE_CASES: {
	// ...existentes
	InactivatePlan: Symbol.for("InactivatePlanUseCase"),
	ReactivatePlan: Symbol.for("ReactivatePlanUseCase"),
},
CONTROLLERS: {
	// ...existentes
	InactivatePlan: Symbol.for("InactivatePlanController"),
	ReactivatePlan: Symbol.for("ReactivatePlanController"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
import { InactivatePlanUseCase } from "@/subscription/application/use-case/inactivate-plan.usecase"
import { ReactivatePlanUseCase } from "@/subscription/application/use-case/reactivate-plan.usecase"
import { InactivatePlanController } from "@/subscription/infra/controller/admin/inactivate-plan.controller"
import { ReactivatePlanController } from "@/subscription/infra/controller/admin/reactivate-plan.controller"

bind(SUBSCRIPTION_TYPES.USE_CASES.InactivatePlan).to(InactivatePlanUseCase)
bind(SUBSCRIPTION_TYPES.USE_CASES.ReactivatePlan).to(ReactivatePlanUseCase)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.InactivatePlan).to(InactivatePlanController)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.ReactivatePlan).to(ReactivatePlanController)
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
]
```

- **Step 6: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.ts \
  apps/backend/src/subscription/application/use-case/inactivate-plan.usecase.test.ts \
  apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.ts \
  apps/backend/src/subscription/application/use-case/reactivate-plan.usecase.test.ts \
  apps/backend/src/subscription/infra/controller/admin/inactivate-plan.controller.ts \
  apps/backend/src/subscription/infra/controller/admin/reactivate-plan.controller.ts \
  apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts \
  apps/backend/src/bootstrap/setup-subscription-module.ts
git commit -m "feat(subscription): add plan inactivate/reactivate use cases and routes"
```

## Critérios de Sucesso

- `InactivatePlanUseCase` marca `isActive: false` sem apagar o registro — `planOfId` continua
  retornando o plano com seus dados intactos (FR-006, FR-008).
- `ReactivatePlanUseCase` marca `isActive: true` em um plano previamente inativado (FR-007).
- Ambos os use cases retornam `failure(PlanNotFoundError)` para um `id` inexistente.
- `PATCH /admin/plans/:id/inactivate` e `PATCH /admin/plans/:id/reactivate` são registradas com
  `isProtected: true, onlyAdmin: true` (FR-012).
