# Task 5: Editar plano — use case + `PUT /admin/plans/:id` [FR-004, FR-005, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-03, task-04

## Visão Geral

`UpdatePlanUseCase` edita nome, preço, periodicidade, tagline e features de um plano existente
(FR-004). Ele **nunca** altera `isActive` — a spec (seção "Endpoints") é explícita: mudança de
status só acontece pelas rotas `PATCH .../inactivate`/`.../reactivate` (task-06), para não existir
dois caminhos concorrentes mudando o mesmo estado (FR-005). Editar um `id` inexistente retorna
`PlanNotFoundError`, nunca uma exceção não tratada (Review Focus desta task). `UpdatePlanController`
expõe `PUT /admin/plans/:id`, protegido `onlyAdmin` (FR-012).

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/update-plan.usecase.ts`
- Create: `apps/backend/src/subscription/infra/controller/admin/update-plan.controller.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`
- Test: `apps/backend/src/subscription/application/use-case/update-plan.usecase.test.ts`
- Test: `apps/backend/src/subscription/infra/controller/admin/update-plan.controller.business-flow-test.ts`

## Interfaces

- **Consome:** `PlanRepository.planOfId`/`.update` (task-03); `Plan.create`/`.restore`,
  `BillingPeriod` (task-01); `PlanNotFoundError` (task-03); `SubscriptionRoutes.ADMIN_PLANS`
  (task-04, base para montar `/admin/plans/:id`); `CreatePlanController`/`create-plan.controller.ts`
  como referência de estrutura de controller admin (task-04).
- **Produz:** `UpdatePlanUseCaseInput = { name: string; priceCents: number; billingPeriod:
  BillingPeriod; tagline: string; features: ReadonlyArray<string>; stripePriceId?: string }`,
  `UpdatePlanUseCase.execute(id: string, input: UpdatePlanUseCaseInput): Promise<Either
  <PlanNotFoundError | InvalidPlanNameError | InvalidPriceError, Plan>>`. `UpdatePlanController`
  (rota `PUT /admin/plans/:id`, `isProtected: true, onlyAdmin: true`).
  `SUBSCRIPTION_TYPES.USE_CASES.UpdatePlan = Symbol.for("UpdatePlanUseCase")`,
  `SUBSCRIPTION_TYPES.CONTROLLERS.UpdatePlan = Symbol.for("UpdatePlanController")`.
  `SubscriptionRoutes.ADMIN_PLAN_BY_ID = "/admin/plans/:id"`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de use case/controller backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (padrão de Use Case que preserva estado
  existente, análogo a `UpdateGymUseCase` preservando `status`).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/update-plan.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { Plan } from "@/subscription/domain/plan"
import { UpdatePlanUseCase } from "./update-plan.usecase"

const VALID_INPUT = {
	name: "Premium Mensal Editado",
	priceCents: 5990,
	billingPeriod: "monthly" as const,
	tagline: "Nova tagline.",
	features: ["Check-ins ilimitados", "Novo benefício"],
}

describe("UpdatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: UpdatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new UpdatePlanUseCase(planRepository)
	})

	test("deve editar nome, preço, periodicidade, tagline e features de um plano existente", async () => {
		const existing = Plan.create({
			name: "Premium Mensal",
			priceCents: 4990,
			billingPeriod: "monthly",
			tagline: "Tagline antiga.",
			features: ["Check-ins ilimitados"],
		}).forceSuccess().value
		await planRepository.save(existing)

		const result = await sut.execute(existing.id, VALID_INPUT)

		expect(result.isSuccess()).toBe(true)
		const updated = result.forceSuccess().value
		expect(updated.name).toBe("Premium Mensal Editado")
		expect(updated.priceCents).toBe(5990)
		expect(updated.tagline).toBe("Nova tagline.")
		expect(updated.features).toEqual(["Check-ins ilimitados", "Novo benefício"])
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/update-plan.usecase.test.ts`
Expected: FAIL — `Cannot find module './update-plan.usecase'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/update-plan.usecase.ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import type { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export interface UpdatePlanUseCaseInput {
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export type UpdatePlanUseCaseOutput = Either<
	PlanNotFoundError | InvalidPlanNameError | InvalidPriceError,
	Plan
>

@injectable()
export class UpdatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		id: string,
		input: UpdatePlanUseCaseInput,
	): Promise<UpdatePlanUseCaseOutput> {
		const existing = await this.planRepository.planOfId(id)
		if (!existing) return failure(new PlanNotFoundError())

		const validatedOrError = Plan.create(input)
		if (validatedOrError.isFailure()) return failure(validatedOrError.value)
		const validated = validatedOrError.value

		// PUT nunca altera isActive (FR-005) — preserva o status atual do plano.
		const plan = Plan.restore({
			id: existing.id,
			name: validated.name,
			priceCents: validated.priceCents,
			billingPeriod: validated.billingPeriod,
			tagline: validated.tagline,
			features: validated.features,
			isActive: existing.isActive,
			stripePriceId: validated.stripePriceId,
		})
		await this.planRepository.update(plan)
		return success(plan)
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/update-plan.usecase.test.ts`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
test("PUT nunca altera isActive — plano inativado permanece inativado após editar", async () => {
	const inactivated = Plan.create({
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline antiga.",
		features: ["Check-ins ilimitados"],
	}).forceSuccess().value.inactivate()
	await planRepository.save(inactivated)

	const result = await sut.execute(inactivated.id, VALID_INPUT)

	expect(result.isSuccess()).toBe(true)
	expect(result.forceSuccess().value.isActive).toBe(false)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/update-plan.usecase.test.ts`
Expected: PASS — o `Plan.restore` do Step 2 já preserva `existing.isActive`; este passo confirma
explicitamente a regra da FR-005 antes de seguir para o controller

- **Step 4: Review Focus: editar um id de plano inexistente retorna PlanNotFoundError, nunca uma falha silenciosa ou 500 — Write the failing test**

```typescript
// apps/backend/src/subscription/infra/controller/admin/update-plan.controller.business-flow-test.ts
import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const VALID_BODY = {
	name: "Premium Mensal Editado",
	priceCents: 5990,
	billingPeriod: "monthly",
	tagline: "Nova tagline.",
	features: ["Check-ins ilimitados"],
}

describe("PUT /admin/plans/:id", () => {
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

	test("id inexistente retorna 404 com corpo de erro explícito, nunca 500", async () => {
		const response = await request(fastifyServer.server)
			.put(`${SubscriptionRoutes.ADMIN_PLANS}/id-inexistente`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toHaveProperty("message")
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/admin/update-plan.controller.business-flow-test.ts`
Expected: FAIL — a rota `PUT /admin/plans/:id` ainda não existe, `supertest` recebe 404 do Fastify
por rota desconhecida (não pela lógica de `PlanNotFoundError`) e `response.body` não tem
`message` no formato esperado

- **Step 5: Write minimal implementation**

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
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
```

```typescript
// apps/backend/src/subscription/infra/controller/admin/update-plan.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { UpdatePlanUseCase } from "@/subscription/application/use-case/update-plan.usecase"
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

const updatePlanParamsSchema = z.object({
	id: z.string().min(1).meta({ description: "Plan ID" }),
})

const updatePlanBodySchema = z.object({
	name: z.string().min(1).meta({ description: "Plan name" }),
	priceCents: z.number().int().min(0).meta({ description: "Price in cents" }),
	billingPeriod: z.enum(BILLING_PERIODS),
	tagline: z.string().min(1),
	features: z.array(z.string().min(1)).min(1),
	stripePriceId: z.string().optional(),
})

export type UpdatePlanPayload = z.infer<typeof updatePlanBodySchema>

@injectable()
export class UpdatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.UpdatePlan)
		private readonly updatePlan: UpdatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"put",
			SubscriptionRoutes.ADMIN_PLAN_BY_ID,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeUpdatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			updatePlanParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedBodyOrError = this.parseRequest(updatePlanBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.updatePlan.execute(
			parsedParamsOrError.value.id,
			parsedBodyOrError.value,
		)
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

function makeUpdatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Update a plan",
		description:
			"Update an existing plan's content fields. Never changes isActive. Requires ADMIN role",
		security: true,
		params: updatePlanParamsSchema,
		body: updatePlanBodySchema,
		responses: {
			200: {
				description: "Plan updated successfully",
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
			422: {
				description: "Invalid request",
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
	UpdatePlan: Symbol.for("UpdatePlanUseCase"),
},
CONTROLLERS: {
	// ...existentes
	UpdatePlan: Symbol.for("UpdatePlanController"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
import { UpdatePlanUseCase } from "@/subscription/application/use-case/update-plan.usecase"
import { UpdatePlanController } from "@/subscription/infra/controller/admin/update-plan.controller"

bind(SUBSCRIPTION_TYPES.USE_CASES.UpdatePlan).to(UpdatePlanUseCase)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.UpdatePlan).to(UpdatePlanController)
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
]
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/admin/update-plan.controller.business-flow-test.ts`
Expected: PASS — `PlanNotFoundError` tem `kind: "not-found"`, mapeado por `BaseController` via
`STATUS_BY_ERROR_KIND` para `404`, nunca `500`

- **Step 6: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/use-case/update-plan.usecase.ts \
  apps/backend/src/subscription/application/use-case/update-plan.usecase.test.ts \
  apps/backend/src/subscription/infra/controller/admin/update-plan.controller.ts \
  apps/backend/src/subscription/infra/controller/admin/update-plan.controller.business-flow-test.ts \
  apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts \
  apps/backend/src/bootstrap/setup-subscription-module.ts
git commit -m "feat(subscription): add UpdatePlanUseCase and PUT /admin/plans/:id"
```

## Critérios de Sucesso

- `UpdatePlanUseCase.execute` edita nome, preço, periodicidade, tagline e features de um plano
  existente (FR-004).
- `isActive` do plano nunca muda através deste use case, mesmo se o plano estiver inativo antes da
  edição (FR-005).
- Editar um `id` inexistente retorna `failure(PlanNotFoundError)` no use case e `404` (nunca `500`)
  na rota HTTP (Review Focus).
- `PUT /admin/plans/:id` é registrado com `isProtected: true, onlyAdmin: true` (FR-012).
