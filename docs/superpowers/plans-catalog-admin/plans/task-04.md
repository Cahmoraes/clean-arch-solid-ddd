# Task 4: Criar plano — use case + `POST /admin/plans` [FR-001, FR-003, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-03

## Visão Geral

`CreatePlanUseCase` cria um `Plan` a partir do input do admin e persiste via `PlanRepository`.
`CreatePlanController` expõe `POST /admin/plans`, registrado com `{ isProtected: true, onlyAdmin:
true }` (Decisão D3 da spec) — nenhum papel diferente de admin pode criar plano (FR-012). Esta
task também introduz a rota base `/admin/plans` em `SubscriptionRoutes`, reaproveitada pelas
tasks seguintes (edição, inativação/reativação, listagem admin).

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/create-plan.usecase.ts`
- Create: `apps/backend/src/subscription/infra/controller/admin/create-plan.controller.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`
- Test: `apps/backend/src/subscription/application/use-case/create-plan.usecase.test.ts`
- Test: `apps/backend/src/subscription/infra/controller/admin/create-plan.authorization.business-flow-test.ts`

## Interfaces

- **Consome:** `PlanRepository.save(plan: Plan): Promise<{ id: string }>`,
  `SUBSCRIPTION_TYPES.REPOSITORIES.Plan` (task-03); `Plan.create(props): Either<InvalidPlanNameError
  | InvalidPriceError, Plan>`, `BillingPeriod` (task-01).
- **Produz:** `CreatePlanUseCaseInput = { name: string; priceCents: number; billingPeriod:
  BillingPeriod; tagline: string; features: ReadonlyArray<string>; stripePriceId?: string }`,
  `CreatePlanUseCase.execute(input: CreatePlanUseCaseInput): Promise<Either<InvalidPlanNameError |
  InvalidPriceError, Plan>>`. `CreatePlanController` (rota `POST /admin/plans`, `isProtected:
  true, onlyAdmin: true`). `SUBSCRIPTION_TYPES.USE_CASES.CreatePlan = Symbol.for
  ("CreatePlanUseCase")`, `SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan = Symbol.for
  ("CreatePlanController")`. `SubscriptionRoutes.ADMIN_PLANS = "/admin/plans"`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de use case/controller backend, sem UI;
  segue as convenções de `apps/backend/AGENTS.md` (padrão de Use Case, Controller, segurança de
  rotas admin).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/application/use-case/create-plan.usecase.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { CreatePlanUseCase } from "./create-plan.usecase"

const VALID_INPUT = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
}

describe("CreatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: CreatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new CreatePlanUseCase(planRepository)
	})

	test("deve criar um plano com sucesso e persisti-lo no repositório", async () => {
		const result = await sut.execute(VALID_INPUT)

		expect(result.isSuccess()).toBe(true)
		const plan = result.forceSuccess().value
		expect(plan.name).toBe("Premium Mensal")
		const saved = await planRepository.planOfId(plan.id)
		expect(saved).not.toBeNull()
	})

	test("deve rejeitar preço negativo com InvalidPriceError e não persistir nada", async () => {
		const result = await sut.execute({ ...VALID_INPUT, priceCents: -1 })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPriceError)
		expect(planRepository.plans.size).toBe(0)
	})

	test("deve rejeitar nome vazio com InvalidPlanNameError e não persistir nada", async () => {
		const result = await sut.execute({ ...VALID_INPUT, name: "" })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPlanNameError)
		expect(planRepository.plans.size).toBe(0)
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/create-plan.usecase.test.ts`
Expected: FAIL — `Cannot find module './create-plan.usecase'`

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/application/use-case/create-plan.usecase.ts
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
import type { PlanRepository } from "../repository/plan-repository"

export interface CreatePlanUseCaseInput {
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export type CreatePlanUseCaseOutput = Either<
	InvalidPlanNameError | InvalidPriceError,
	Plan
>

@injectable()
export class CreatePlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: CreatePlanUseCaseInput,
	): Promise<CreatePlanUseCaseOutput> {
		const planOrError = Plan.create(input)
		if (planOrError.isFailure()) return failure(planOrError.value)

		const plan = planOrError.value
		await this.planRepository.save(plan)
		return success(plan)
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/create-plan.usecase.test.ts`
Expected: PASS

- **Step 3: Review Focus: usuário autenticado sem papel de admin recebe 403 ao chamar POST /admin/plans — Write the failing test**

```typescript
// apps/backend/src/subscription/infra/controller/admin/create-plan.authorization.business-flow-test.ts
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase.js"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { SubscriptionRoutes } from "../routes/subscription-routes.js"

const VALID_BODY = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
}

describe("Autorização de POST /admin/plans", () => {
	let fastifyServer: FastifyAdapter
	let planRepository: InMemoryPlanRepository
	let authenticate: AuthenticateUseCase
	let memberToken: string
	let adminToken: string

	async function login(email: string): Promise<string> {
		const result = await authenticate.execute({ email, password: "any_password" })
		return result.force.success().value.token
	}

	beforeEach(async () => {
		container.snapshot()
		planRepository = new InMemoryPlanRepository()
		const userRepository = new InMemoryUserRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		await createAndSaveUser({
			userRepository,
			email: "member.plans@test.com",
			password: "any_password",
			role: "MEMBER",
		})
		await createAndSaveUser({
			userRepository,
			email: "admin.plans@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		memberToken = await login("member.plans@test.com")
		adminToken = await login("admin.plans@test.com")
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("403 para MEMBER e nenhum plano criado", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.ADMIN_PLANS)
			.set("Authorization", `Bearer ${memberToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(planRepository.plans.size).toBe(0)
	})

	test("201 para ADMIN e plano criado", async () => {
		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.ADMIN_PLANS)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(VALID_BODY)

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(planRepository.plans.size).toBe(1)
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/admin/create-plan.authorization.business-flow-test.ts`
Expected: FAIL — `SubscriptionRoutes.ADMIN_PLANS is undefined` (rota `POST /admin/plans` ainda
não existe, `supertest` recebe 404 em vez de 403/201)

- **Step 4: Write minimal implementation**

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
} as const

export type SubscriptionRoutesType =
	(typeof SubscriptionRoutes)[keyof typeof SubscriptionRoutes]
```

```typescript
// apps/backend/src/subscription/infra/controller/admin/create-plan.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BILLING_PERIODS } from "@/subscription/domain/plan"
import type { CreatePlanUseCase } from "@/subscription/application/use-case/create-plan.usecase"
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

const createPlanBodySchema = z.object({
	name: z.string().min(1).meta({ description: "Plan name", example: "Premium Mensal" }),
	priceCents: z
		.number()
		.int()
		.min(0)
		.meta({ description: "Price in cents, never negative", example: 4990 }),
	billingPeriod: z.enum(BILLING_PERIODS).meta({
		description: "Billing period",
		example: "monthly",
	}),
	tagline: z.string().min(1).meta({
		description: "Short plan description",
		example: "Acesso ilimitado a todas as academias parceiras.",
	}),
	features: z
		.array(z.string().min(1))
		.min(1)
		.meta({ description: "Plan benefits", example: ["Check-ins ilimitados"] }),
	stripePriceId: z
		.string()
		.optional()
		.meta({ description: "Optional external Stripe price id" }),
})

export type CreatePlanPayload = z.infer<typeof createPlanBodySchema>

@injectable()
export class CreatePlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.CreatePlan)
		private readonly createPlan: CreatePlanUseCase,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"post",
			SubscriptionRoutes.ADMIN_PLANS,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeCreatePlanSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(createPlanBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.createPlan.execute(parsedBodyOrError.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const plan = result.value
		return {
			status: HTTP_STATUS.CREATED,
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

function makeCreatePlanSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["admin", "plans"],
		summary: "Create a plan",
		description: "Create a new subscription plan. Requires ADMIN role",
		security: true,
		body: createPlanBodySchema,
		responses: {
			201: {
				description: "Plan created successfully",
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
			403: {
				description: "Forbidden — requires ADMIN role",
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
	CreatePlan: Symbol.for("CreatePlanUseCase"),
},
CONTROLLERS: {
	// ...existentes
	CreatePlan: Symbol.for("CreatePlanController"),
},
```

```typescript
// apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts
import { CreatePlanUseCase } from "@/subscription/application/use-case/create-plan.usecase"
import { CreatePlanController } from "@/subscription/infra/controller/admin/create-plan.controller"

// dentro do ContainerModule, junto dos demais binds
bind(SUBSCRIPTION_TYPES.USE_CASES.CreatePlan).to(CreatePlanUseCase)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan).to(CreatePlanController)
```

```typescript
// apps/backend/src/bootstrap/setup-subscription-module.ts
const controllers = [
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateSubscription),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans),
	resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan),
]
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/admin/create-plan.authorization.business-flow-test.ts`
Expected: PASS

- **Step 5: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/application/use-case/create-plan.usecase.ts \
  apps/backend/src/subscription/application/use-case/create-plan.usecase.test.ts \
  apps/backend/src/subscription/infra/controller/admin/create-plan.controller.ts \
  apps/backend/src/subscription/infra/controller/admin/create-plan.authorization.business-flow-test.ts \
  apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts \
  apps/backend/src/bootstrap/setup-subscription-module.ts
git commit -m "feat(subscription): add CreatePlanUseCase and POST /admin/plans"
```

## Critérios de Sucesso

- `CreatePlanUseCase.execute` com dados válidos persiste o plano e retorna `success(plan)`
  (FR-001).
- Preço negativo ou nome vazio retornam `failure` e **nada** é persistido (FR-001, FR-003).
- `POST /admin/plans` sem papel ADMIN retorna `403 Forbidden` e nenhum plano é criado (FR-012,
  Review Focus).
- `POST /admin/plans` com ADMIN retorna `201` com o plano criado.
