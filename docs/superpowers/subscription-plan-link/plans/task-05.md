# Task 5: GET /subscriptions/me [FR-005, FR-006, FR-008, FR-017, FR-019]

**Status:** PENDING

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-01, task-02

## Visão Geral

Entrega a consulta da assinatura vigente do usuário autenticado: `GET /subscriptions/me` devolve 200 com a assinatura (plano embutido, período, `state` derivado) ou 200 com `null` quando não há assinatura. O plano é devolvido mesmo inativado, linhas legadas voltam com `plan: null` e a assinatura com cancelamento agendado que passou do fim do período volta como `expired`, sem job externo.

## Arquivos

- Create: `apps/backend/src/subscription/application/use-case/get-my-subscription.usecase.ts`
- Create: `apps/backend/src/subscription/application/use-case/get-my-subscription.usecase.test.ts`
- Create: `apps/backend/src/subscription/infra/controller/get-my-subscription.controller.ts`
- Create: `apps/backend/src/subscription/infra/controller/get-my-subscription.controller.business-flow-test.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts`
- Modify: `apps/backend/src/shared/infra/controller/factory/response-factory.ts`
- Test: `apps/backend/src/shared/infra/controller/factory/response-factory.test.ts` (acrescentar se o arquivo existir; criar se não existir)

## Interfaces

- **Consome:**
  - de task-01: `toMySubscriptionView(subscription: Subscription, plan: Plan | null, now: Date): MySubscriptionView` e o tipo `MySubscriptionView` de `@/subscription/application/dto/my-subscription-view`; `nullableMySubscriptionResponseSchema` de `@/subscription/infra/controller/schema/my-subscription-response-schema`; `Subscription.restore(props)` (campos opcionais `planId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`), getter `planId: string | undefined`.
  - de task-02: `SubscriptionRepository.ofUserId(userId: string): Promise<Subscription | null>`; `PlanRepository.planOfId(id: string): Promise<Plan | null>` (já existente).
  - já existentes: `ResponseFactory.OK(input?: { body?: any })`, `BaseController.createResponseError(result)`, `OpenApiSchemaBuilder.build`, `SubscriptionRoutes`, `SUBSCRIPTION_TYPES`.
- **Produz:**
  - `GetMySubscriptionUseCase.execute(input: { userId: string }, now?: Date): Promise<Either<Error, MySubscriptionView | null>>`, token `SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription`.
  - `GetMySubscriptionController` (token `SUBSCRIPTION_TYPES.CONTROLLERS.GetMySubscription`) registrando `GET` em `SubscriptionRoutes.ME = "/subscriptions/me"`, protegido, 200 com `MySubscriptionView | null`.
  - `SubscriptionRoutes.ME = "/subscriptions/me"` (as constantes `ME_PLAN` e `ME_CANCEL` são criadas pelas tasks que registram essas rotas).
  - `ResponseFactory.OK({ body: null })` passa a devolver `body: null`.

### Conformidade com as Skills Padrão

- `no-workarounds`: a resposta `null` é corrigida na causa (extração do corpo em `ResponseFactory`), sem contornar no controller.
- `test-antipatterns`: testes de caso de uso com repositórios em memória reais e testes HTTP contra o servidor de teste; sem mock do que está sob teste.
- `typescript-advanced`: retorno `Either<Error, MySubscriptionView | null>` e derivação de `state` sem cast.

## Passos

- **Step 1: Confirm the unverified facts before writing code**

(a) Confirme a forma estreita do runner de business-flow: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts` deve coletar exatamente 1 arquivo. (b) Abra `apps/backend/src/shared/infra/controller/factory/response-factory.ts` e confirme que `OK(input?)` existe e que `extractBody` faz `rest.body ? rest.body : rest`: com `{ body: null }` isso devolve o objeto `{ body: null }` inteiro, e não `null`. Esse é o comportamento que o teste do Step 3 vai pinar. (c) Abra `apps/backend/src/shared/infra/openapi/openapi-schema-builder.ts` e confirme que `buildResponses` espalha o JSON schema da resposta no objeto da resposta: um schema `nullable` gera `anyOf` no nível da resposta; o servidor de teste (`serverBuildForTest`) precisa registrar a rota sem erro e o Fastify precisa serializar `null`. Se o teste HTTP do Step 3 mostrar corpo vazio em vez de `null`, investigue o caminho de envio no `FastifyAdapter` e corrija a causa, sem workaround.

- **Step 2: Write the failing test (caso de uso)**

Crie `apps/backend/src/subscription/application/use-case/get-my-subscription.usecase.test.ts`:

```ts
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import type { GetMySubscriptionUseCase } from "./get-my-subscription.usecase"

const NOW = new Date("2026-01-15T00:00:00.000Z")

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

describe("GetMySubscription UseCase", () => {
	let sut: GetMySubscriptionUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository

	beforeEach(() => {
		container.snapshot()
		subscriptionRepository = setupInMemoryRepositories().subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve devolver null quando o usuário não tem assinatura (resultado normal, não erro)", async () => {
		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toBeNull()
	})

	test("Deve devolver a assinatura ativa com plano embutido, período e cancelAtPeriodEnd", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	test("Deve devolver cancel_scheduled quando o cancelamento está agendado e o período não venceu", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute({ userId: "user-1" }, NOW)

		const view = result.forceSuccess().value
		expect(view?.state).toBe("cancel_scheduled")
		expect(view?.cancelAtPeriodEnd).toBe(true)
	})

	test("Deve devolver expired quando o cancelamento agendado já passou do fim do período, sem job externo", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({ cancelAtPeriodEnd: true }),
		)

		const result = await sut.execute(
			{ userId: "user-1" },
			new Date("2026-02-01T00:00:00.000Z"),
		)

		expect(result.forceSuccess().value?.state).toBe("expired")
	})

	test("Deve devolver o plano mesmo quando ele foi inativado no catálogo", async () => {
		await planRepository.save(makePlan().inactivate())
		await subscriptionRepository.save(makeSubscription())

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value?.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})
	})

	test("Deve devolver plan null para assinatura legada sem plano vinculado", async () => {
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		const view = result.forceSuccess().value
		expect(view).not.toBeNull()
		expect(view?.plan).toBeNull()
	})

	test("Deve ignorar assinaturas de outros usuários", async () => {
		await subscriptionRepository.save(makeSubscription({ userId: "user-2" }))

		const result = await sut.execute({ userId: "user-1" }, NOW)

		expect(result.forceSuccess().value).toBeNull()
	})
})
```

- **Step 3: Write the failing test (HTTP)**

Crie `apps/backend/src/subscription/infra/controller/get-my-subscription.controller.business-flow-test.ts`:

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

const USER_ID = "user-me-1"
const CREDENTIALS = { email: "me@test.com", password: "any_password" }

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

describe("GetMySubscriptionController", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository
	let token: string

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		subscriptionRepository = new InMemorySubscriptionRepository()
		planRepository = new InMemoryPlanRepository()
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

	test("Deve retornar 401 sem JWT", async () => {
		const response = await request(fastifyServer.server).get(
			SubscriptionRoutes.ME,
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 200 com corpo null quando o usuário não tem assinatura", async () => {
		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.text).toBe("null")
	})

	test("Deve retornar 200 com a assinatura, plano embutido e estado active", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(makeSubscription())

		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2999-01-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	test("Deve retornar state expired quando o cancelamento agendado já venceu", async () => {
		await planRepository.save(makePlan())
		await subscriptionRepository.save(
			makeSubscription({
				cancelAtPeriodEnd: true,
				currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
			}),
		)

		const response = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.state).toBe("expired")
	})

	test("Deve retornar o plano inativado e plan null para linha legada", async () => {
		await planRepository.save(makePlan().inactivate())
		await subscriptionRepository.save(makeSubscription())

		const inactive = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(inactive.body.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})

		subscriptionRepository.data.clear()
		await subscriptionRepository.save(makeSubscription({ planId: undefined }))

		const legacy = await request(fastifyServer.server)
			.get(SubscriptionRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(legacy.status).toBe(HTTP_STATUS.OK)
		expect(legacy.body.plan).toBeNull()
	})
})
```

Acrescente em `response-factory.test.ts` (crie o arquivo com os imports abaixo se ele não existir):

```ts
import { ResponseFactory } from "./response-factory"

describe("ResponseFactory.OK", () => {
	test("preserva body null em vez de embrulhar o input", () => {
		expect(ResponseFactory.OK({ body: null })).toEqual({ status: 200, body: null })
	})

	test("continua devolvendo o objeto do body quando ele existe", () => {
		expect(ResponseFactory.OK({ body: { id: "x" } })).toEqual({
			status: 200,
			body: { id: "x" },
		})
	})
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/get-my-subscription.usecase.test.ts src/shared/infra/controller/factory/response-factory.test.ts`
Expected: FAIL: o container não resolve `SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription` (símbolo indefinido) e `ResponseFactory.OK({ body: null })` devolve `{ status: 200, body: { body: null } }`.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/get-my-subscription.controller.business-flow-test.ts`
Expected: FAIL: as respostas para `/subscriptions/me` são 404 (rota inexistente).

- **Step 5: Write minimal implementation (rotas, tokens, use case)**

Em `subscription-routes.ts`, acrescente ao objeto `SubscriptionRoutes`, depois de `CREATE`:

```ts
	ME: `${SUBSCRIPTION_PREFIX}/me`,
```

Em `subscription-types.ts`, acrescente em `USE_CASES` `GetMySubscription: Symbol.for("GetMySubscriptionUseCase"),` e em `CONTROLLERS` `GetMySubscription: Symbol.for("GetMySubscriptionController"),`.

Crie `apps/backend/src/subscription/application/use-case/get-my-subscription.usecase.ts`:

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import {
	type MySubscriptionView,
	toMySubscriptionView,
} from "../dto/my-subscription-view"
import type { PlanRepository } from "../repository/plan-repository"
import type { SubscriptionRepository } from "../../repository/subscription-repository"

export interface GetMySubscriptionUseCaseInput {
	userId: string
}

export type GetMySubscriptionUseCaseOutput = Either<
	Error,
	MySubscriptionView | null
>

@injectable()
export class GetMySubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
	) {}

	public async execute(
		input: GetMySubscriptionUseCaseInput,
		now: Date = new Date(),
	): Promise<GetMySubscriptionUseCaseOutput> {
		try {
			const subscription = await this.subscriptionRepository.ofUserId(
				input.userId,
			)
			if (!subscription) return success(null)
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

Em `response-factory.ts`, troque o corpo de `extractBody` por:

```ts
	private static extractBody(rest: any) {
		return rest.body === undefined ? rest : rest.body
	}
```

Depois de alterar o `ResponseFactory` compartilhado, rode os testes que o usam (`rg -l "ResponseFactory" apps/backend/src -g "*test*"`) para confirmar que nenhum dependia de `body` falsy (`0`, `""`, `false`) ser embrulhado.

- **Step 6: Write minimal implementation (controller e DI)**

Crie `apps/backend/src/subscription/infra/controller/get-my-subscription.controller.ts`:

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
import type { GetMySubscriptionUseCase } from "../../application/use-case/get-my-subscription.usecase.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"
import { nullableMySubscriptionResponseSchema } from "./schema/my-subscription-response-schema.js"

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class GetMySubscriptionController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription)
		private readonly getMySubscription: GetMySubscriptionUseCase,
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
			"get",
			SubscriptionRoutes.ME,
			{ callback: this.callback, isProtected: true },
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const result = await this.getMySubscription.execute({
			userId: req.user.sub.id,
		})
		if (result.isFailure()) return this.createResponseError(result)
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["subscriptions"],
		summary: "Get the authenticated user's current subscription",
		description:
			"Returns the current subscription with its plan, or null when the user has none.",
		security: true,
		responses: {
			200: {
				description: "Current subscription or null",
				schema: nullableMySubscriptionResponseSchema,
			},
			401: { description: "Unauthorized", schema: errorResponseSchema },
		},
	})
}
```

Em `subscription-module.ts`, importe `GetMySubscriptionUseCase` (`@/subscription/application/use-case/get-my-subscription.usecase`) e `GetMySubscriptionController` (`@/subscription/infra/controller/get-my-subscription.controller`) e registre:

```ts
	bind(SUBSCRIPTION_TYPES.USE_CASES.GetMySubscription).to(
		GetMySubscriptionUseCase,
	)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.GetMySubscription).to(
		GetMySubscriptionController,
	)
```

Em `setup-subscription-module.ts`, acrescente ao array `controllers`:

```ts
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.GetMySubscription),
```

- **Step 7: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/get-my-subscription.usecase.test.ts src/shared/infra/controller/factory/response-factory.test.ts`
Expected: PASS.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/get-my-subscription.controller.business-flow-test.ts`
Expected: PASS.

- **Step 8: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src
git commit -m "feat(subscription): add GET /subscriptions/me"
```

## Critérios de Sucesso

- `GET /subscriptions/me` autenticado devolve a assinatura com `id`, `state`, `plan`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd` (FR-005).
- Sem assinatura, a resposta é 200 com corpo `null` (FR-006); sem JWT, 401.
- O plano inativado continua sendo devolvido (FR-008); linha legada devolve `plan: null` (FR-019).
- Cancelamento agendado com período vencido devolve `state: "expired"` sem job externo (FR-017).
