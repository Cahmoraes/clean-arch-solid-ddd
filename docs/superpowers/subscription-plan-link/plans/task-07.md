# Task 7: POST /subscriptions/me/cancel [FR-013, FR-014, FR-016]

**Status:** PENDING

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-01, task-02

## Visão Geral

Permite ao usuário agendar o cancelamento da assinatura ao fim do período pago. A assinatura continua ativa até `currentPeriodEnd`, cancelar de novo mantém o estado agendado sem erro, e quem não tem assinatura ativa (ou já teve a assinatura vencida) recebe "Você não possui assinatura ativa". O caso de uso novo chama-se `ScheduleSubscriptionCancellationUseCase`; o `CancelSubscriptionUseCase` existente é do webhook do Stripe e não é alterado.

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/schedule-subscription-cancellation.usecase.ts`
- Create: `apps/backend/src/subscription/application/use-case/schedule-subscription-cancellation.usecase.test.ts`
- Create: `apps/backend/src/subscription/infra/controller/schedule-subscription-cancellation.controller.ts`
- Create: `apps/backend/src/subscription/infra/controller/schedule-subscription-cancellation.controller.business-flow-test.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`

## Interfaces

- **Consome:**
  - de task-01: `Subscription.scheduleCancellation(now?: Date): void` (idempotente), `Subscription.isExpired(now: Date): boolean`, getters `planId`, `cancelAtPeriodEnd`, `status`, `updatedAt`; `Subscription.restore(props)` com campos opcionais `planId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`; `NoActiveSubscriptionError` (`@/subscription/domain/error/no-active-subscription-error.js`); `toMySubscriptionView(subscription: Subscription, plan: Plan | null, now: Date): MySubscriptionView` e `MySubscriptionView` de `@/subscription/application/dto/my-subscription-view`; `mySubscriptionResponseSchema` de `@/subscription/infra/controller/schema/my-subscription-response-schema`.
  - de task-02: `SubscriptionRepository.ofUserId(userId: string): Promise<Subscription | null>`, `SubscriptionRepository.update(subscription): Promise<void>` (persiste `cancel_at_period_end`).
  - já existentes: `PlanRepository.planOfId(id: string): Promise<Plan | null>`, `ResponseFactory.OK`, `SubscriptionRoutes` e `SUBSCRIPTION_PREFIX` em `subscription-routes.ts` (esta task acrescenta `ME_CANCEL`).
- **Produz:**
  - `ScheduleSubscriptionCancellationUseCase.execute(input: { userId: string }, now?: Date): Promise<Either<Error, MySubscriptionView>>`, token `SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation`.
  - `SubscriptionRoutes.ME_CANCEL = "/subscriptions/me/cancel"`.
  - `ScheduleSubscriptionCancellationController` (token `SUBSCRIPTION_TYPES.CONTROLLERS.ScheduleSubscriptionCancellation`): `POST /subscriptions/me/cancel`, sem body, 200 com `MySubscriptionView` (`cancelAtPeriodEnd = true`, `state = "cancel_scheduled"`); 404 `NoActiveSubscriptionError` sem assinatura ativa ou vencida.

### Conformidade com as Skills Padrão

- `no-workarounds`: a idempotência é regra do agregado (`scheduleCancellation` não muda estado nem `updatedAt` se já agendado), não um guard duplicado no caso de uso.
- `test-antipatterns`: repositórios em memória reais e asserções sobre o estado gravado.
- `typescript-advanced`: retorno `Either<Error, MySubscriptionView>`.

## Passos

- **Step 1: Confirm the unverified facts and the route constant**

(a) Confirme a forma estreita do runner de business-flow: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts` coleta exatamente 1 arquivo. (b) Abra `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts` e confirme que `ME_CANCEL` ainda não existe (é criada no Step 6). (c) Confirme em `apps/backend/src/shared/infra/controller/base-controller.ts` que `createResponseError(result)` mapeia `DomainError.kind` para o status via `STATUS_BY_ERROR_KIND` (`not-found` para 404). (d) Confirme em `apps/backend/src/shared/infra/openapi/openapi-schema-builder.ts` que `body` é opcional (a rota não tem body).

- **Step 2: Write the failing test (caso de uso)**

Crie `apps/backend/src/subscription/application/use-case/schedule-subscription-cancellation.usecase.test.ts`:

```ts
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "@/subscription/domain/error/no-active-subscription-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import type { ScheduleSubscriptionCancellationUseCase } from "./schedule-subscription-cancellation.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

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
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ScheduleSubscriptionCancellation UseCase", () => {
	let sut: ScheduleSubscriptionCancellationUseCase
	let subscriptionRepository: InMemorySubscriptionRepository

	beforeEach(async () => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
		const planRepository = new InMemoryPlanRepository()
		await planRepository.save(
			Plan.restore({
				id: "plan-1",
				name: "Premium Mensal",
				priceCents: 4990,
				billingPeriod: "monthly",
				tagline: "Tagline",
				features: [],
				isActive: true,
				stripePriceId: "price_monthly",
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		sut = container.get(
			SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve agendar o cancelamento mantendo a assinatura ativa até o fim do período", async () => {
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: "sub-1",
			state: "cancel_scheduled",
			cancelAtPeriodEnd: true,
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
		})
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.status).toBe("active")
		expect(saved?.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve ser idempotente: cancelar de novo mantém o estado agendado sem erro", async () => {
		await subscriptionRepository.save(makeSubscription())
		await sut.execute({ userId: "user-1" }, NOW)
		const updatedAtAfterFirst = (await subscriptionRepository.ofUserId("user-1"))
			?.updatedAt

		const second = await sut.execute(
			{ userId: "user-1" },
			new Date("2026-01-20T00:00:00.000Z"),
		)

		expect(second.isSuccess()).toBe(true)
		expect(second.forceSuccess().value.cancelAtPeriodEnd).toBe(true)
		expect(second.forceSuccess().value.state).toBe("cancel_scheduled")
		const saved = await subscriptionRepository.ofUserId("user-1")
		expect(saved?.updatedAt).toEqual(updatedAtAfterFirst)
	})

	test("Deve falhar com NoActiveSubscriptionError quando o usuário não tem assinatura", async () => {
		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
		expect((result.value as Error).message).toBe("Você não possui assinatura ativa")
	})

	test("Deve falhar com NoActiveSubscriptionError quando a assinatura já venceu", async () => {
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-01-10T00:00:00.000Z"),
			}),
		)

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.value).toBeInstanceOf(NoActiveSubscriptionError)
	})

	test("Deve devolver plan null para assinatura legada e ainda assim agendar o cancelamento", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value.plan).toBeNull()
		expect(result.forceSuccess().value.cancelAtPeriodEnd).toBe(true)
	})
})
```

- **Step 3: Write the failing test (HTTP)**

Crie `apps/backend/src/subscription/infra/controller/schedule-subscription-cancellation.controller.business-flow-test.ts`:

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

const USER_ID = "user-cancel-1"
const CREDENTIALS = { email: "cancel@test.com", password: "any_password" }

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
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("ScheduleSubscriptionCancellationController", () => {
	let fastifyServer: FastifyAdapter
	let subscriptionRepository: InMemorySubscriptionRepository
	let token: string

	beforeEach(async () => {
		container.snapshot()
		const userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		const planRepository = new InMemoryPlanRepository()
		await planRepository.save(
			Plan.restore({
				id: "plan-1",
				name: "Premium Mensal",
				priceCents: 4990,
				billingPeriod: "monthly",
				tagline: "Tagline",
				features: [],
				isActive: true,
				stripePriceId: "price_monthly",
			}),
		)
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
			.toConstantValue(new TestingSubscriptionGateway())
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

	function postCancel() {
		return request(fastifyServer.server)
			.post(SubscriptionRoutes.ME_CANCEL)
			.set("Authorization", `Bearer ${token}`)
	}

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server).post(
			SubscriptionRoutes.ME_CANCEL,
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 com cancelAtPeriodEnd true e a assinatura ainda ativa", async () => {
		await subscriptionRepository.save(makeSubscription())

		const response = await postCancel()

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "sub-1",
			state: "cancel_scheduled",
			cancelAtPeriodEnd: true,
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
		})
	})

	test("Deve retornar 200 também ao cancelar de novo (idempotente)", async () => {
		await subscriptionRepository.save(makeSubscription())

		const first = await postCancel()
		const second = await postCancel()

		expect(first.status).toBe(HTTP_STATUS.OK)
		expect(second.status).toBe(HTTP_STATUS.OK)
		expect(second.body.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve retornar 404 com a mensagem esperada quando não há assinatura ativa", async () => {
		const response = await postCancel()

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body.message).toBe("Você não possui assinatura ativa")
	})
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/schedule-subscription-cancellation.usecase.test.ts`
Expected: FAIL: o container não resolve `SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation` (símbolo indefinido).

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/schedule-subscription-cancellation.controller.business-flow-test.ts`
Expected: FAIL: `POST /subscriptions/me/cancel` responde 404 de rota inexistente nos casos que esperam 200, e `SubscriptionRoutes.ME_CANCEL` é indefinido.

- **Step 5: Write minimal implementation (rota, tokens e caso de uso)**

Em `subscription-routes.ts`, acrescente ao objeto `SubscriptionRoutes`, depois de `CREATE`:

```ts
	ME_CANCEL: `${SUBSCRIPTION_PREFIX}/me/cancel`,
```

Em `subscription-types.ts`, acrescente em `USE_CASES` `ScheduleSubscriptionCancellation: Symbol.for("ScheduleSubscriptionCancellationUseCase"),` e em `CONTROLLERS` `ScheduleSubscriptionCancellation: Symbol.for("ScheduleSubscriptionCancellationController"),`.

Crie `apps/backend/src/subscription/application/use-case/schedule-subscription-cancellation.usecase.ts`:

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { NoActiveSubscriptionError } from "../../domain/error/no-active-subscription-error.js"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import type { PlanRepository } from "../repository/plan-repository"

export interface ScheduleSubscriptionCancellationUseCaseInput {
	userId: string
}

export type ScheduleSubscriptionCancellationUseCaseOutput = Either<
	Error,
	MySubscriptionView
>

@injectable()
export class ScheduleSubscriptionCancellationUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: ScheduleSubscriptionCancellationUseCaseInput,
		now: Date = new Date(),
	): Promise<ScheduleSubscriptionCancellationUseCaseOutput> {
		try {
			const subscription = await this.subscriptionRepository.ofUserId(
				input.userId,
			)
			if (!subscription || subscription.isExpired(now)) {
				return failure(new NoActiveSubscriptionError())
			}
			subscription.scheduleCancellation(now)
			await this.subscriptionRepository.update(subscription)
			const plan = subscription.planId
				? await this.planRepository.planOfId(subscription.planId)
				: null
			return success(toMySubscriptionView(subscription, plan, now))
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}
}
```

- **Step 6: Write minimal implementation (controller e DI)**

Crie `apps/backend/src/subscription/infra/controller/schedule-subscription-cancellation.controller.ts`:

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
import type { ScheduleSubscriptionCancellationUseCase } from "../../application/use-case/schedule-subscription-cancellation.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"
import { mySubscriptionResponseSchema } from "./schema/my-subscription-response-schema.js"

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class ScheduleSubscriptionCancellationController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation)
		private readonly scheduleCancellation: ScheduleSubscriptionCancellationUseCase,
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
			"post",
			SubscriptionRoutes.ME_CANCEL,
			{ callback: this.callback, isProtected: true },
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const result = await this.scheduleCancellation.execute({
			userId: req.user.sub.id,
		})
		if (result.isFailure()) return this.createResponseError(result)
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary: "Schedule the cancellation of the authenticated user's subscription",
		description:
			"Marks the subscription to be canceled at the end of the paid period. Calling it again keeps the scheduled state.",
		security: true,
		responses: {
			200: {
				description: "Subscription with the cancellation scheduled",
				schema: mySubscriptionResponseSchema,
			},
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: {
				description: "No active subscription",
				schema: errorResponseSchema,
			},
		},
	})
}
```

Em `subscription-module.ts`, importe `ScheduleSubscriptionCancellationUseCase` (`@/subscription/application/use-case/schedule-subscription-cancellation.usecase`) e `ScheduleSubscriptionCancellationController` (`@/subscription/infra/controller/schedule-subscription-cancellation.controller`) e registre:

```ts
	bind(SUBSCRIPTION_TYPES.USE_CASES.ScheduleSubscriptionCancellation).to(
		ScheduleSubscriptionCancellationUseCase,
	)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.ScheduleSubscriptionCancellation).to(
		ScheduleSubscriptionCancellationController,
	)
```

Em `setup-subscription-module.ts`, acrescente ao array `controllers`:

```ts
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ScheduleSubscriptionCancellation),
```

- **Step 7: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/schedule-subscription-cancellation.usecase.test.ts`
Expected: PASS.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/schedule-subscription-cancellation.controller.business-flow-test.ts`
Expected: PASS.

- **Step 8: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src
git commit -m "feat(subscription): add POST /subscriptions/me/cancel"
```

## Critérios de Sucesso

- Cancelar marca `cancelAtPeriodEnd = true` e a assinatura segue com `status = "active"` até `currentPeriodEnd` (FR-013).
- Cancelar duas vezes responde 200 nas duas e mantém `cancel_scheduled`, sem alterar `updatedAt` na segunda (FR-014).
- Sem assinatura ativa, ou com assinatura vencida, a resposta é 404 com a mensagem "Você não possui assinatura ativa" (FR-016).
- O `CancelSubscriptionUseCase` do webhook do Stripe permanece intacto.
