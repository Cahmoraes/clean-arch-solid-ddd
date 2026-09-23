# Task 6: PATCH /subscriptions/me/plan [FR-009, FR-010, FR-012]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-01, task-02, task-03

## Visão Geral

Permite ao usuário trocar o plano da assinatura ativa. O caso de uso resolve o plano pelo `priceId`, valida que existe assinatura ativa sem cancelamento agendado, troca o price no gateway e só então grava o novo `planId` na mesma linha; se o gateway falhar, nada é gravado. Assinaturas legadas sem plano também podem trocar, regularizando o vínculo.

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/change-subscription-plan.usecase.ts`
- Create: `apps/backend/src/subscription/application/use-case/change-subscription-plan.usecase.test.ts`
- Create: `apps/backend/src/subscription/infra/controller/change-subscription-plan.controller.ts`
- Create: `apps/backend/src/subscription/infra/controller/change-subscription-plan.controller.business-flow-test.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`

## Interfaces

- **Consome:**
  - de task-01: `Subscription.assertCanChangePlan(): void` (lança `SubscriptionCancellationScheduledError`), `Subscription.changePlan(planId: string, now?: Date): void`, `Subscription.isExpired(now: Date): boolean`, getters `planId`, `billingSubscriptionId`, `cancelAtPeriodEnd`, `status`; `Subscription.restore(props)` com campos opcionais `planId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`; `NoActiveSubscriptionError` (`@/subscription/domain/error/no-active-subscription-error.js`); `SubscriptionCancellationScheduledError` (`@/subscription/domain/error/subscription-cancellation-scheduled-error.js`); `toMySubscriptionView(subscription: Subscription, plan: Plan | null, now: Date): MySubscriptionView` e `MySubscriptionView` de `@/subscription/application/dto/my-subscription-view`; `mySubscriptionResponseSchema` de `@/subscription/infra/controller/schema/my-subscription-response-schema`.
  - de task-02: `SubscriptionRepository.ofUserId(userId: string): Promise<Subscription | null>`, `SubscriptionRepository.update(subscription): Promise<void>` (persiste `plan_id`); `PlanRepository.planOfStripePriceId(priceId: string): Promise<Plan | null>`.
  - de task-03: `SubscriptionGateway.changeSubscriptionPrice(data: { billingSubscriptionId: string; priceId: string }): Promise<void>`; `TestingSubscriptionGateway.changedPrices: ChangeSubscriptionPriceInput[]` e `failPriceChangeWith(error: Error): void`.
  - já existentes: `PlanNotFoundError` (`@/subscription/application/error/plan-not-found-error`), `ResponseFactory.OK`, `SubscriptionRoutes` e `SUBSCRIPTION_PREFIX` em `subscription-routes.ts` (esta task acrescenta `ME_PLAN`).
- **Produz:**
  - `ChangeSubscriptionPlanUseCase.execute(input: { userId: string; priceId: string }, now?: Date): Promise<Either<Error, MySubscriptionView>>`, token `SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan`.
  - `SubscriptionRoutes.ME_PLAN = "/subscriptions/me/plan"`.
  - `ChangeSubscriptionPlanController` (token `SUBSCRIPTION_TYPES.CONTROLLERS.ChangeSubscriptionPlan`): `PATCH /subscriptions/me/plan`, body `{ priceId: string }`, 200 com `MySubscriptionView`; 404 (`PlanNotFoundError`, `NoActiveSubscriptionError`), 409 (`SubscriptionCancellationScheduledError`), 400 (body inválido).
  - Precedência de erros: plano inexistente/inativo primeiro, depois assinatura ausente/vencida, depois cancelamento agendado, depois gateway.

### Conformidade com as Skills Padrão

- `no-workarounds`: a ordem plano, validação, gateway, gravação local é a regra de negócio; falha do gateway propaga como erro visível, sem rollback manual nem gravação otimista.
- `test-antipatterns`: gateway de testes real com falha injetada e repositórios em memória; asserções sobre o estado gravado, não sobre chamadas internas do caso de uso.
- `typescript-advanced`: entrada validada por zod, retorno `Either<Error, MySubscriptionView>`.

## Passos

- **Step 1: Confirm the unverified facts and the route constant**

(a) Confirme a forma estreita do runner de business-flow: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts` coleta exatamente 1 arquivo. (b) Abra `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts` e confirme que `ME_PLAN` ainda não existe (é criada no Step 6). (c) Confirme em `apps/backend/src/shared/infra/controller/base-controller.ts` a assinatura de `parseRequest(schema, data)`: o controller de criação usa `this.parseRequest(zodSchema, req.body)` e testa `isFailure()`; o mesmo padrão vale aqui. (d) Confirme em `apps/backend/src/shared/infra/server/http-server.ts` que `register` aceita `"patch"` como método (o `PATCH /users/activate` existente prova que sim).

- **Step 2: Write the failing test (caso de uso)**

Crie `apps/backend/src/subscription/application/use-case/change-subscription-plan.usecase.test.ts`:

```ts
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "@/subscription/domain/error/no-active-subscription-error.js"
import { SubscriptionCancellationScheduledError } from "@/subscription/domain/error/subscription-cancellation-scheduled-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { ChangeSubscriptionPlanUseCase } from "./change-subscription-plan.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-mensal",
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

function makeSubscription(
	overrides: Partial<Parameters<typeof Subscription.restore>[0]> = {},
) {
	return Subscription.restore({
		id: "sub-1",
		userId: "user-1",
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-mensal",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ChangeSubscriptionPlan UseCase", () => {
	let sut: ChangeSubscriptionPlanUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository
	let gateway: TestingSubscriptionGateway

	beforeEach(async () => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: "price_yearly",
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		gateway = new TestingSubscriptionGateway()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(gateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve trocar o plano na mesma assinatura e trocar o price no gateway", async () => {
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-anual", name: "Premium Anual", priceId: "price_yearly" },
		})
		expect(subscriptionRepository.data.size).toBe(1)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.id).toBe("sub-1")
		expect(saved?.planId).toBe("plan-anual")
		expect(gateway.changedPrices).toEqual([
			{ billingSubscriptionId: "sub_stripe_1", priceId: "price_yearly" },
		])
	})

	test("Deve permitir a troca em assinatura legada sem plano, gravando o novo plano", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isSuccess()).toBe(true)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-anual")
	})

	test("Deve falhar com PlanNotFoundError quando o priceId não corresponde a plano ativo", async () => {
		await subscriptionRepository.save(makeSubscription())
		await planRepository.update(
			makePlan({ id: "plan-anual", stripePriceId: "price_yearly" }).inactivate(),
		)

		const unknown = await sut.execute(
			{ userId: "user-1", priceId: "price_unknown" },
			NOW,
		)
		const inactive = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(unknown.value).toBeInstanceOf(PlanNotFoundError)
		expect(inactive.value).toBeInstanceOf(PlanNotFoundError)
		expect(gateway.changedPrices).toEqual([])
	})

	test("Deve falhar com NoActiveSubscriptionError quando o usuário não tem assinatura", async () => {
		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
		expect(gateway.changedPrices).toEqual([])
	})

	test("Deve falhar com NoActiveSubscriptionError quando a assinatura já venceu", async () => {
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-01-10T00:00:00.000Z"),
			}),
		)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
	})

	test("Deve falhar com SubscriptionCancellationScheduledError quando há cancelamento agendado e não chamar o gateway", async () => {
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.value).toBeInstanceOf(SubscriptionCancellationScheduledError)
		expect(gateway.changedPrices).toEqual([])
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-mensal")
	})
})
```

- **Step 3: Review Focus: Falha do gateway na troca de plano → erro visível, `planId` local inalterado — Write the failing test**

Acrescente dentro do `describe("ChangeSubscriptionPlan UseCase", ...)` do mesmo arquivo:

```ts
	test("Review Focus: falha do gateway na troca devolve o erro e mantém o planId local inalterado", async () => {
		await subscriptionRepository.save(makeSubscription())
		const gatewayError = new Error("stripe indisponível")
		gateway.failPriceChangeWith(gatewayError)

		const result = await sut.execute(
			{ userId: "user-1", priceId: "price_yearly" },
			NOW,
		)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(gatewayError)
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.planId).toBe("plan-mensal")
		expect(saved?.updatedAt).toBeUndefined()
	})
```

- **Step 4: Write the failing test (HTTP)**

Crie `apps/backend/src/subscription/infra/controller/change-subscription-plan.controller.business-flow-test.ts`:

```ts
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { SubscriptionRoutes } from "./routes/subscription-routes"

const USER_ID = "user-change-1"
const CREDENTIALS = { email: "change@test.com", password: "any_password" }

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-mensal",
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

function makeSubscription(
	overrides: Partial<Parameters<typeof Subscription.restore>[0]> = {},
) {
	return Subscription.restore({
		id: "sub-1",
		userId: USER_ID,
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-mensal",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ChangeSubscriptionPlanController", () => {
	let fastifyServer: FastifyAdapter
	let subscriptionRepository: InMemorySubscriptionRepository
	let gateway: TestingSubscriptionGateway
	let token: string

	beforeEach(async () => {
		container.snapshot()
		const userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		const planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: "price_yearly",
			}),
		)
		gateway = new TestingSubscriptionGateway()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
			.toConstantValue(subscriptionRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(gateway)
		const authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: USER_ID,
			email: CREDENTIALS.email,
			password: CREDENTIALS.password,
		})
		token = (await authenticate.execute(CREDENTIALS)).force.success().value
			.token
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	function patchPlan(body: unknown) {
		return request(fastifyServer.server)
			.patch(SubscriptionRoutes.ME_PLAN)
			.set("Authorization", `Bearer ${token}`)
			.send(body as object)
	}

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server)
			.patch(SubscriptionRoutes.ME_PLAN)
			.send({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 e o novo plano na mesma assinatura", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-anual", name: "Premium Anual", priceId: "price_yearly" },
		})
		expect(subscriptionRepository.data.size).toBe(1)
		expect(gateway.changedPrices).toHaveLength(1)
	})

	test("Deve retornar 400 quando o body não tem priceId", async () => {
		const response = await patchPlan({})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 404 quando o priceId não corresponde a nenhum plano", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await patchPlan({ priceId: "price_unknown" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})

	test("Deve retornar 404 com a mensagem esperada quando não há assinatura ativa", async () => {
		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body.message).toBe("Você não possui assinatura ativa")
	})

	test("Deve retornar 409 quando há cancelamento agendado", async () => {
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const response = await patchPlan({ priceId: "price_yearly" })

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		expect(gateway.changedPrices).toEqual([])
	})
})
```

- **Step 5: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/change-subscription-plan.usecase.test.ts`
Expected: FAIL: o container não resolve `SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan` (símbolo indefinido).

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/change-subscription-plan.controller.business-flow-test.ts`
Expected: FAIL: `PATCH /subscriptions/me/plan` responde 404 de rota inexistente nos casos que esperam 200/409/400.

- **Step 6: Write minimal implementation (rota, tokens e caso de uso)**

Em `subscription-routes.ts`, acrescente ao objeto `SubscriptionRoutes`, depois de `CREATE`:

```ts
	ME_PLAN: `${SUBSCRIPTION_PREFIX}/me/plan`,
```

Em `subscription-types.ts`, acrescente em `USE_CASES` `ChangeSubscriptionPlan: Symbol.for("ChangeSubscriptionPlanUseCase"),` e em `CONTROLLERS` `ChangeSubscriptionPlan: Symbol.for("ChangeSubscriptionPlanController"),`.

Crie `apps/backend/src/subscription/application/use-case/change-subscription-plan.usecase.ts`:

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "../../domain/error/no-active-subscription-error.js"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export interface ChangeSubscriptionPlanUseCaseInput {
	userId: string
	priceId: string
}

export type ChangeSubscriptionPlanUseCaseOutput = Either<
	Error,
	MySubscriptionView
>

@injectable()
export class ChangeSubscriptionPlanUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: ChangeSubscriptionPlanUseCaseInput,
		now: Date = new Date(),
	): Promise<ChangeSubscriptionPlanUseCaseOutput> {
		try {
			const plan = await this.planRepository.planOfStripePriceId(input.priceId)
			if (!plan?.isActive) return failure(new PlanNotFoundError())

			const subscription = await this.subscriptionRepository.ofUserId(
				input.userId,
			)
			if (!subscription || subscription.isExpired(now)) {
				return failure(new NoActiveSubscriptionError())
			}
			subscription.assertCanChangePlan()

			await this.subscriptionGateway.changeSubscriptionPrice({
				billingSubscriptionId: subscription.billingSubscriptionId,
				priceId: input.priceId,
			})

			subscription.changePlan(plan.id, now)
			await this.subscriptionRepository.update(subscription)
			return success(toMySubscriptionView(subscription, plan, now))
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}
}
```

- **Step 7: Write minimal implementation (controller e DI)**

Crie `apps/backend/src/subscription/infra/controller/change-subscription-plan.controller.ts`:

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import type { ChangeSubscriptionPlanUseCase } from "../../application/use-case/change-subscription-plan.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"
import { mySubscriptionResponseSchema } from "./schema/my-subscription-response-schema.js"

const changePlanRequestSchema = z.object({
	priceId: z
		.string()
		.min(1)
		.meta({ description: "Stripe Price ID of the new plan", example: "price_1abc123" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class ChangeSubscriptionPlanController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan)
		private readonly changeSubscriptionPlan: ChangeSubscriptionPlanUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅ | 🔒" })
	public async init(): Promise<void> {
		await this.httpServer.register(
			"patch",
			SubscriptionRoutes.ME_PLAN,
			{ callback: this.callback, isProtected: true },
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseResult = this.parseRequest(changePlanRequestSchema, req.body)
		if (parseResult.isFailure()) return this.createResponseError(parseResult)

		const result = await this.changeSubscriptionPlan.execute({
			userId: req.user.sub.id,
			priceId: parseResult.value.priceId,
		})
		if (result.isFailure()) return this.createResponseError(result)
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary: "Change the plan of the authenticated user's subscription",
		description:
			"Switches the current subscription to another plan, keeping the same subscription.",
		body: changePlanRequestSchema,
		security: true,
		responses: {
			200: { description: "Subscription with the new plan", schema: mySubscriptionResponseSchema },
			400: { description: "Invalid body", schema: errorResponseSchema },
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: {
				description: "Plan not found or no active subscription",
				schema: errorResponseSchema,
			},
			409: {
				description: "Cancellation already scheduled",
				schema: errorResponseSchema,
			},
		},
	})
}
```

Em `subscription-module.ts`, importe `ChangeSubscriptionPlanUseCase` (`@/subscription/application/use-case/change-subscription-plan.usecase`) e `ChangeSubscriptionPlanController` (`@/subscription/infra/controller/change-subscription-plan.controller`) e registre:

```ts
	bind(SUBSCRIPTION_TYPES.USE_CASES.ChangeSubscriptionPlan).to(
		ChangeSubscriptionPlanUseCase,
	)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.ChangeSubscriptionPlan).to(
		ChangeSubscriptionPlanController,
	)
```

Em `setup-subscription-module.ts`, acrescente ao array `controllers`:

```ts
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ChangeSubscriptionPlan),
```

- **Step 8: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/change-subscription-plan.usecase.test.ts`
Expected: PASS.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/change-subscription-plan.controller.business-flow-test.ts`
Expected: PASS.

- **Step 9: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src
git commit -m "feat(subscription): add PATCH /subscriptions/me/plan"
```

## Critérios de Sucesso

- A troca mantém a mesma linha de assinatura (uma única ativa) e chama o gateway com o `billingSubscriptionId` e o novo `priceId` (FR-009).
- Sem assinatura ativa (ou vencida) a resposta é 404 "Você não possui assinatura ativa"; com cancelamento agendado, 409 sem chamar o gateway (FR-010).
- Falha do gateway devolve erro e deixa `planId` e `updatedAt` locais intactos.
- Assinatura legada sem plano troca normalmente e passa a ter o novo `planId` (FR-012).
