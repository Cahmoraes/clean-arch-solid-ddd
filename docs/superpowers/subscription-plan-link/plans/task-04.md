# Task 4: CreateSubscription grava plano e período, encerra vencida [FR-001, FR-002, FR-004, FR-018]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-01, task-02

## Visão Geral

`POST /subscriptions` passa a resolver o plano pelo `priceId`, recusar plano inexistente ou inativado antes de chamar o gateway, recusar quem já tem assinatura ativa não vencida e gravar `planId` e período na nova assinatura. Quando o usuário tem uma assinatura vencida (cancelamento agendado que passou do fim do período), o caso de uso a encerra e cria a nova na mesma transação, para o índice único parcial não bloquear a reassinatura.

## Arquivos

- Modify: `apps/backend/src/subscription/application/use-case/create-subscription.usecase.ts`
- Modify: `apps/backend/src/subscription/application/use-case/create-subscription.usecase.test.ts`
- Modify: `apps/backend/src/subscription/infra/controller/create-subscription.controller.ts`
- Modify: `apps/backend/src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`

## Interfaces

- **Consome:**
  - de task-01: `Subscription.create(props: SubscriptionCreate)` com `planId?: string`, `billingPeriod?: BillingPeriod`, `currentPeriodStart?: Date`; `Subscription.restore(props: SubscriptionRestore)` (campos opcionais `planId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`); `subscription.isExpired(now: Date): boolean`; `subscription.closeExpired(now?: Date): void`; getters `planId`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `status`, `canceledAt`; `computePeriodEnd(start: Date, billingPeriod: BillingPeriod): Date` de `@/subscription/domain/compute-period-end`; `ActiveSubscriptionAlreadyExistsError` de `@/subscription/domain/error/active-subscription-already-exists-error.js`.
  - de task-02: `SubscriptionRepository.ofUserId(userId: string): Promise<Subscription | null>` (linha `active` do usuário, vencida ou não); `PlanRepository.planOfStripePriceId(priceId: string): Promise<Plan | null>` (ativo ou inativo); `SubscriptionRepository.save(subscription): Promise<void>` lança `ActiveSubscriptionAlreadyExistsError` na violação do índice único parcial.
  - já existentes: `PlanNotFoundError` (`@/subscription/application/error/plan-not-found-error`, construtor `(errorOptions?: ErrorOptions)`), `UnitOfWork.runTransaction<T>(callback: (transaction: object) => Promise<T>): Promise<T>` (`@/shared/infra/database/repository/unit-of-work/unit-of-work`, token `SHARED_TYPES.UnitOfWork` de `@/shared/infra/ioc/types`), `SUBSCRIPTION_TYPES.REPOSITORIES.Plan`, `InMemoryPlanRepository` (`.save(plan)`), `Plan.restore(...)`.
- **Produz:**
  - `CreateSubscriptionUseCase.execute(input: CreateSubscriptionUseCaseInput, tx?: object): Promise<Either<Error, { subscriptionId: string; status: SubscriptionStatusTypes }>>` (mesmo formato de retorno de hoje); falhas de domínio: `PlanNotFoundError` (404), `ActiveSubscriptionAlreadyExistsError` (409).
  - Assinatura nova sempre gravada com `planId = plan.id`, `currentPeriodStart = now`, `currentPeriodEnd = computePeriodEnd(now, plan.billingPeriod)`.

### Conformidade com as Skills Padrão

- `no-workarounds`: o conflito de assinatura ativa é decidido pela regra de domínio (`isExpired`) e reforçado pelo índice do banco; sem `try/catch` que mascare erro.
- `test-antipatterns`: os testes usam repositórios em memória reais e verificam efeitos observáveis (linhas gravadas, chamadas ao gateway), sem mockar o que se está testando.
- `typescript-advanced`: união `Either<Error, ...>` mantida; `PlanNotFoundError` e `ActiveSubscriptionAlreadyExistsError` como `DomainError` discriminados por `kind`.

## Passos

- **Step 1: Confirm the test runner form and the UnitOfWork import path**

Confirme a forma estreita de business-flow (não verificada até aqui): rode `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts` e verifique que coleta exatamente 1 arquivo; se coletar mais, use a forma que coleta 1 nos passos abaixo. Confirme também como um use case existente importa o tipo `UnitOfWork` (`rg "UnitOfWork" apps/backend/src -g "*.usecase.ts"`) e copie o mesmo caminho de import para o passo de implementação.

- **Step 2: Write the failing test (caso de uso)**

Substitua `apps/backend/src/subscription/application/use-case/create-subscription.usecase.test.ts` por:

```ts
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type {
	CreateSubscriptionUseCase,
	CreateSubscriptionUseCaseInput,
} from "./create-subscription.usecase"

const MONTHLY_PRICE_ID = "price_test_123"
const YEARLY_PRICE_ID = "price_test_yearly"

function makePlan(overrides: Partial<Parameters<typeof Plan.restore>[0]> = {}) {
	return Plan.restore({
		id: "plan-mensal-id",
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline",
		features: [],
		isActive: true,
		stripePriceId: MONTHLY_PRICE_ID,
		...overrides,
	})
}

describe("CreateSubscription UseCase", () => {
	let sut: CreateSubscriptionUseCase
	let subscriptionGateway: TestingSubscriptionGateway
	let subscriptionRepository: InMemorySubscriptionRepository
	let planRepository: InMemoryPlanRepository

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		subscriptionRepository = repositories.subscriptionRepository
		planRepository = new InMemoryPlanRepository()
		await planRepository.save(makePlan())
		await planRepository.save(
			makePlan({
				id: "plan-anual-id",
				name: "Premium Anual",
				billingPeriod: "yearly",
				stripePriceId: YEARLY_PRICE_ID,
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
		subscriptionGateway = new TestingSubscriptionGateway()
		container
			.rebind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
			.toConstantValue(subscriptionGateway)
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription)
	})

	afterEach(() => {
		vi.useRealTimers()
		container.restore()
	})

	const baseInput = (): CreateSubscriptionUseCaseInput => ({
		userId: "user-id-123",
		customerId: "cus_test_123",
		priceId: MONTHLY_PRICE_ID,
		paymentMethodId: "pm_test_visa_123",
	})

	test("Deve criar uma Subscription e retornar { subscriptionId, status }", async () => {
		const input = baseInput()

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const value = result.forceSuccess().value
		expect(value.subscriptionId).toMatch(/^sub_test_/)
		expect(value.status).toBe("active")

		const subscriptionSaved = await subscriptionRepository.ofCustomerId(
			input.customerId,
		)
		expect(subscriptionSaved?.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		)
		expect(subscriptionSaved?.userId).toBe(input.userId)
		expect(subscriptionSaved?.customerId).toBe(input.customerId)
		expect(subscriptionSaved?.billingSubscriptionId).toBe(value.subscriptionId)
		expect(subscriptionSaved?.status).toBe("active")
	})

	test("Deve gravar planId e período mensal a partir do plano resolvido pelo priceId", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-31T10:00:00.000Z"))

		const result = await sut.execute(baseInput())

		expect(result.isSuccess()).toBe(true)
		const saved = await subscriptionRepository.ofUserId("user-id-123")
		expect(saved?.planId).toBe("plan-mensal-id")
		expect(saved?.currentPeriodStart.toISOString()).toBe(
			"2026-01-31T10:00:00.000Z",
		)
		expect(saved?.currentPeriodEnd.toISOString()).toBe(
			"2026-02-28T10:00:00.000Z",
		)
		expect(saved?.cancelAtPeriodEnd).toBe(false)
	})

	test("Deve gravar período anual para plano yearly", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-03-10T10:00:00.000Z"))

		await sut.execute({ ...baseInput(), priceId: YEARLY_PRICE_ID })

		const saved = await subscriptionRepository.ofUserId("user-id-123")
		expect(saved?.planId).toBe("plan-anual-id")
		expect(saved?.currentPeriodEnd.toISOString()).toBe(
			"2027-03-10T10:00:00.000Z",
		)
	})

	test("Deve falhar com PlanNotFoundError e não chamar o gateway quando nenhum plano corresponde ao priceId", async () => {
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")
		const attachSpy = vi.spyOn(
			subscriptionGateway,
			"attachPaymentMethodToCustomer",
		)

		const result = await sut.execute({
			...baseInput(),
			priceId: "price_unknown",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(attachSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(0)
	})

	test("Deve falhar com ActiveSubscriptionAlreadyExistsError quando já existe assinatura ativa não vencida", async () => {
		await sut.execute(baseInput())
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")

		const result = await sut.execute({
			...baseInput(),
			customerId: "cus_other",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(1)
	})

	test("Deve tratar cancelamento agendado ainda dentro do período como ativa e recusar", async () => {
		const scheduled = Subscription.restore({
			id: "sub-scheduled",
			userId: "user-id-123",
			billingSubscriptionId: "sub_stripe_scheduled",
			customerId: "cus_test_123",
			status: "active",
			planId: "plan-mensal-id",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
			currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
			cancelAtPeriodEnd: true,
		})
		await subscriptionRepository.save(scheduled)

		const result = await sut.execute(baseInput())

		expect(result.value).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
	})

	test("Deve encerrar a assinatura vencida e criar a nova com novo período", async () => {
		const expired = Subscription.restore({
			id: "sub-expired",
			userId: "user-id-123",
			billingSubscriptionId: "sub_stripe_expired",
			customerId: "cus_test_123",
			status: "active",
			planId: "plan-anual-id",
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
			currentPeriodStart: new Date("2025-01-01T00:00:00.000Z"),
			currentPeriodEnd: new Date("2025-02-01T00:00:00.000Z"),
			cancelAtPeriodEnd: true,
		})
		await subscriptionRepository.save(expired)

		const result = await sut.execute(baseInput())

		expect(result.isSuccess()).toBe(true)
		expect(expired.status).toBe("canceled")
		expect(expired.canceledAt?.toISOString()).toBe("2025-02-01T00:00:00.000Z")
		expect(subscriptionRepository.data.size).toBe(2)
		const active = await subscriptionRepository.ofUserId("user-id-123")
		expect(active?.id).not.toBe("sub-expired")
		expect(active?.planId).toBe("plan-mensal-id")
		expect(active?.cancelAtPeriodEnd).toBe(false)
	})

	test("Deve falhar quando o gateway falhar no attachPaymentMethodToCustomer", async () => {
		const error = new Error("attach failed")
		subscriptionGateway.attachPaymentMethodToCustomer = async () => {
			throw error
		}

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(error)
		expect(subscriptionRepository.data.size).toBe(0)
	})

	test("Deve falhar quando o gateway falhar no createSubscription", async () => {
		const error = new Error("create failed")
		subscriptionGateway.createSubscription = async () => {
			throw error
		}

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBe(error)
		expect(subscriptionRepository.data.size).toBe(0)
	})
})
```

- **Step 3: Review Focus: `priceId` de plano inativado ao assinar → recusado como plano não encontrado, sem chamar o gateway — Write the failing test**

Acrescente dentro do `describe("CreateSubscription UseCase", ...)` do mesmo arquivo:

```ts
	test("Review Focus: priceId de plano inativado é recusado como plano não encontrado, sem chamar o gateway", async () => {
		await planRepository.update(makePlan().inactivate())
		const createSpy = vi.spyOn(subscriptionGateway, "createSubscription")
		const attachSpy = vi.spyOn(
			subscriptionGateway,
			"attachPaymentMethodToCustomer",
		)

		const result = await sut.execute(baseInput())

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PlanNotFoundError)
		expect(createSpy).not.toHaveBeenCalled()
		expect(attachSpy).not.toHaveBeenCalled()
		expect(subscriptionRepository.data.size).toBe(0)
	})
```

- **Step 4: Write the failing test (business-flow)**

Em `create-subscription.controller.business-flow-test.ts`: adicione os imports

```ts
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { Plan } from "@/subscription/domain/plan"
```

declare `let planRepository: InMemoryPlanRepository` junto das outras variáveis e, no `beforeEach`, antes de `authenticate = container.get(...)`, acrescente:

```ts
		planRepository = new InMemoryPlanRepository()
		await planRepository.save(
			Plan.restore({
				id: "plan-mensal-id",
				name: "Premium Mensal",
				priceCents: 4990,
				billingPeriod: "monthly",
				tagline: "Tagline",
				features: [],
				isActive: true,
				stripePriceId: "price_test_123",
			}),
		)
		container
			.rebind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
			.toConstantValue(planRepository)
```

e acrescente os testes ao final do `describe`:

```ts
	test("Deve retornar 404 quando nenhum plano corresponde ao priceId", async () => {
		const credentials = { email: "no-plan@test.com", password: "any_password" }
		const user = await createAndSaveUser({
			userRepository,
			id: "user-no-plan",
			email: credentials.email,
			password: credentials.password,
		})
		user.assignBillingCustomerId("cus_no_plan")
		await userRepository.update(user)
		const token = await authenticatedToken(credentials)

		const response = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send({ priceId: "price_unknown", paymentMethodId: "pm_test_visa" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})

	test("Deve retornar 409 quando o usuário já possui assinatura ativa", async () => {
		const credentials = { email: "twice@test.com", password: "any_password" }
		const user = await createAndSaveUser({
			userRepository,
			id: "user-twice",
			email: credentials.email,
			password: credentials.password,
		})
		user.assignBillingCustomerId("cus_twice")
		await userRepository.update(user)
		const token = await authenticatedToken(credentials)
		const body = { priceId: "price_test_123", paymentMethodId: "pm_test_visa" }

		const first = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send(body)
		const second = await request(fastifyServer.server)
			.post(SubscriptionRoutes.CREATE)
			.set("Authorization", `Bearer ${token}`)
			.send(body)

		expect(first.status).toBe(HTTP_STATUS.CREATED)
		expect(second.status).toBe(HTTP_STATUS.CONFLICT)
		expect(second.body).toHaveProperty("message")
	})
```

O teste existente "Deve retornar 201 e criar a Subscription..." passa a depender do plano semeado no `beforeEach`; acrescente nele, ao final, `expect(saved?.planId).toBe("plan-mensal-id")`.

- **Step 5: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/create-subscription.usecase.test.ts`
Expected: FAIL: os testes de plano e de conflito falham (a implementação atual não resolve plano nem consulta `ofUserId`; `saved?.planId` é `undefined`).

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`
Expected: FAIL: o teste do 404 recebe 201 e o do 409 (segunda assinatura) recebe 201.

- **Step 6: Write minimal implementation**

Substitua `apps/backend/src/subscription/application/use-case/create-subscription.usecase.ts` por (ajuste o caminho do import de `UnitOfWork` ao que o Step 1 confirmou):

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { UnitOfWork } from "@/shared/infra/database/repository/unit-of-work/unit-of-work"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "../../domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "../../domain/subscription"
import type { SubscriptionStatusTypes } from "../../domain/subscription-status-types"
import type { SubscriptionGateway } from "../../gateway/subscription-gateway"
import type { SubscriptionRepository } from "../../repository/subscription-repository"
import type { BillingCustomerNotProvisionedError } from "../error/billing-customer-not-provisioned-error"
import { PlanNotFoundError } from "../error/plan-not-found-error"
import type { PlanRepository } from "../repository/plan-repository"

export interface CreateSubscriptionUseCaseInput {
	userId: string
	customerId: string
	priceId: string
	paymentMethodId: string
}

export interface CreateSubscriptionUseCaseSuccess {
	subscriptionId: string
	status: SubscriptionStatusTypes
}

export type CreateSubscriptionUseCaseOutput = Either<
	BillingCustomerNotProvisionedError | Error,
	CreateSubscriptionUseCaseSuccess
>

@injectable()
export class CreateSubscriptionUseCase {
	constructor(
		@inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		private readonly subscriptionGateway: SubscriptionGateway,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		private readonly subscriptionRepository: SubscriptionRepository,
		@inject(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		private readonly planRepository: PlanRepository,
		@inject(SHARED_TYPES.UnitOfWork)
		private readonly unitOfWork: UnitOfWork,
	) {}

	public async execute(
		input: CreateSubscriptionUseCaseInput,
		tx?: object,
	): Promise<CreateSubscriptionUseCaseOutput> {
		try {
			const plan = await this.planRepository.planOfStripePriceId(input.priceId)
			if (!plan?.isActive) return failure(new PlanNotFoundError())

			const now = new Date()
			const existing = await this.subscriptionRepo(tx).ofUserId(input.userId)
			if (existing && !existing.isExpired(now)) {
				return failure(new ActiveSubscriptionAlreadyExistsError())
			}

			await this.subscriptionGateway.attachPaymentMethodToCustomer({
				customerId: input.customerId,
				paymentMethodId: input.paymentMethodId,
			})
			const subscriptionResponse =
				await this.subscriptionGateway.createSubscription({
					customerId: input.customerId,
					priceId: input.priceId,
					paymentMethodId: input.paymentMethodId,
					metadata: { userId: input.userId },
				})
			const subscription = Subscription.create({
				userId: input.userId,
				customerId: input.customerId,
				billingSubscriptionId: subscriptionResponse.subscriptionId,
				status: subscriptionResponse.status,
				planId: plan.id,
				billingPeriod: plan.billingPeriod,
				currentPeriodStart: now,
			})
			await this.persist(subscription, existing, tx)
			return success({
				subscriptionId: subscription.billingSubscriptionId,
				status: subscription.status,
			})
		} catch (error) {
			return failure(error instanceof Error ? error : new Error(String(error)))
		}
	}

	private async persist(
		subscription: Subscription,
		expired: Subscription | null,
		tx?: object,
	): Promise<void> {
		const run = async (transaction: object): Promise<void> => {
			const repository = this.subscriptionRepository.withTransaction(transaction)
			if (expired) {
				expired.closeExpired()
				await repository.update(expired)
			}
			await repository.save(subscription)
		}
		if (tx) {
			await run(tx)
			return
		}
		await this.unitOfWork.runTransaction(run)
	}

	private subscriptionRepo(tx?: object): SubscriptionRepository {
		return tx
			? this.subscriptionRepository.withTransaction(tx)
			: this.subscriptionRepository
	}
}
```

Em `create-subscription.controller.ts`, no `makeSwaggerSchema`, substitua a resposta `409` e acrescente a `404`:

```ts
			404: {
				description: "Plan not found for the given priceId",
				schema: errorResponseSchema,
			},
			409: {
				description:
					"Billing customer not provisioned or user already has an active subscription",
				schema: errorResponseSchema,
			},
```

- **Step 7: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/application/use-case/create-subscription.usecase.test.ts`
Expected: PASS.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`
Expected: PASS.

- **Step 8: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src/subscription
git commit -m "feat(subscription): link created subscriptions to plan and period, close expired"
```

## Critérios de Sucesso

- A assinatura criada grava `planId`, `currentPeriodStart` e `currentPeriodEnd` (FR-001), com fim de período mensal ou anual conforme o plano (31/jan mensal termina em 28/fev).
- `priceId` sem plano correspondente, ou de plano inativado, responde 404 (`PlanNotFoundError`) sem chamar o gateway (FR-002).
- Usuário com assinatura ativa não vencida (inclusive com cancelamento agendado ainda dentro do período) recebe 409 e nenhuma linha nova (FR-004).
- Usuário com assinatura vencida reassina: a linha vencida vira `canceled` com `canceledAt = currentPeriodEnd` e a nova é criada com novo período (FR-018).
