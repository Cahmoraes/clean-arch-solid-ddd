# Task 7: Repositórios de plano, evento de webhook Stripe e assinatura no Mongo [FR-004, FR-007, FR-008]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega os três repositórios do domínio de assinatura no Mongo: `MongoPlanRepository`, `MongoStripeWebhookEventRepository` (o mesmo evento processa uma vez) e `MongoSubscriptionRepository` (no máximo uma assinatura ativa por usuário, `billing_subscription_id` único e `ofUserId` só da ativa). Os índices únicos já existem desde a task de conexão; aqui os repositórios traduzem o código 11000 para os mesmos erros de domínio do Prisma e participam das transações do `MongoUnitOfWork`, o que permite provar que encerrar a assinatura expirada e criar a nova acontece de forma atômica. Também entrega as três suítes de contrato (plano, evento de webhook, assinatura).

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-plan-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-subscription-repository.ts`
- Create: `apps/backend/test/repository-contract/plan-repository-contract.ts`
- Create: `apps/backend/test/repository-contract/stripe-webhook-event-repository-contract.ts`
- Create: `apps/backend/test/repository-contract/subscription-repository-contract.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-stripe-webhook-event-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-plan-repository.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-subscription-repository.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.PLANS`, `COLLECTIONS.STRIPE_WEBHOOK_EVENTS`, `COLLECTIONS.SUBSCRIPTIONS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `isDuplicateKeyError(error: unknown): error is MongoServerError`, `duplicateKeyFields(error: MongoServerError): string[]` de `@/shared/infra/database/connection/mongo/mongo-duplicate-key` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `MongoUnitOfWork.isClientSession(obj: unknown): obj is ClientSession`, `new MongoUnitOfWork(connection)` e `runTransaction<T>(callback: Callback<T>): Promise<T>` de `@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work` (task-03)
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` de `@/shared/infra/database/repository/unit-of-work/mongo-session` (task-03)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` (task-04)
  - `deleteDocumentsReferencing(connection, ids, targets)` de `test/mongo/delete-documents-referencing` (task-04)
  - `class PrismaReferenceSeeder { ensureUsers(ids: readonly string[]): Promise<void>; ensurePlans(ids: readonly string[]): Promise<void>; cleanup(): Promise<void> }` de `test/repository-contract/prisma-reference-seeder` (task-06)
- **Produz:**
  - `class MongoPlanRepository implements PlanRepository`, `type PlanDocument`
  - `class MongoStripeWebhookEventRepository implements StripeWebhookEventRepository`, `type StripeWebhookEventDocument`
  - `class MongoSubscriptionRepository implements SubscriptionRepository`, `type SubscriptionDocument`
  - (todos `@injectable()`, construtor `(connection: MongoConnection)`, em `@/shared/infra/database/repository/mongo/mongo-plan-repository`, `.../mongo-stripe-webhook-event-repository`, `.../mongo-subscription-repository`)
  - `describePlanRepositoryContract`, `describeStripeWebhookEventRepositoryContract`, `describeSubscriptionRepositoryContract`, cada um `(name: string, factory: () => Promise<...ContractContext>): void`, com contexts `{ repository; newId(): string; cleanup(): Promise<void> }` e, só no de assinatura, `ensureReferences(references: { userIds: string[] }): Promise<void>`, em `test/repository-contract/<entidade>-repository-contract`
  - Convenção dos documentos: `plans` (`_id`, `name`, `price_cents`, `billing_period`, `tagline`, `features`, `is_active`, `stripe_price_id`, `created_at`, `updated_at`); `stripe_webhook_events` (`_id` UUID gerado, `event_id`, `event_type`, `processed_at`); `subscriptions` (`_id`, `user_id`, `billing_subscription_id`, `customer_id`, `status`, `canceled_at`, `created_at`, `updated_at`, `plan_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`)

### Skills a invocar

- `typescript-advanced`: os três `*Document` como `type` alias; `billing_period` e `status` tipados com `BillingPeriod` e `SubscriptionStatusTypes` do domínio, sem strings soltas.
- `no-workarounds`: o 11000 só vira erro de domínio quando o campo violado é o esperado (`user_id`, `event_id`); a correção do `update` do in-memory é feita na raiz (substituir pelo id), não contornada no teste.
- `test-antipatterns`: INV-03 e INV-07 são provocados no índice real do Mongo; INV-04 usa o `MongoUnitOfWork` real e lê o estado depois, sem mock de repositório.

## Passos

- **Step 1: Confirm the domain symbols**

Abrir `apps/backend/src/subscription/domain/plan.ts`, `subscription.ts` e `error/active-subscription-already-exists-error.ts` e confirmar: `Plan.restore({ id, name, priceCents, billingPeriod, tagline, features, isActive, stripePriceId })`, `Subscription.restore({ id, userId, billingSubscriptionId, customerId, status, planId, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, canceledAt, createdAt, updatedAt })` e que `ActiveSubscriptionAlreadyExistsError` aceita `{ cause }` no construtor (assim o `PrismaSubscriptionRepository` o instancia). Os caminhos de import usados abaixo foram copiados dos repositórios Prisma existentes.

- **Step 2: Write the failing tests (contracts and Mongo specifics)**

`apps/backend/test/repository-contract/plan-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { PlanRepository } from "@/subscription/application/repository/plan-repository"
import { Plan } from "@/subscription/domain/plan"

export interface PlanRepositoryContractContext {
	repository: PlanRepository
	newId(): string
	cleanup(): Promise<void>
}

type PlanProps = Parameters<typeof Plan.restore>[0]

export function describePlanRepositoryContract(
	name: string,
	factory: () => Promise<PlanRepositoryContractContext>,
): void {
	describe(`PlanRepository contract (${name})`, () => {
		let context: PlanRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildPlan(overrides: Partial<PlanProps> = {}): Plan {
			const id = overrides.id ?? context.newId()
			return Plan.restore({
				id,
				name: "Contract Plan",
				priceCents: 1990,
				billingPeriod: "monthly",
				tagline: "Plano de contrato",
				features: ["acesso", "relatórios"],
				isActive: true,
				stripePriceId: `price_${id}`,
				...overrides,
			})
		}

		it("saves a plan and finds it by id", async () => {
			const plan = buildPlan()

			const saved = await context.repository.save(plan)
			const found = await context.repository.planOfId(plan.id)

			expect(saved).toEqual({ id: plan.id })
			expect(found?.name).toBe("Contract Plan")
			expect(found?.priceCents).toBe(1990)
			expect(found?.billingPeriod).toBe("monthly")
			expect(found?.tagline).toBe("Plano de contrato")
			expect([...(found?.features ?? [])]).toEqual(["acesso", "relatórios"])
			expect(found?.isActive).toBe(true)
			expect(found?.stripePriceId).toBe(plan.stripePriceId)
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.planOfId(context.newId())).toBeNull()
		})

		it("update persists the changed fields", async () => {
			const id = context.newId()
			await context.repository.save(buildPlan({ id }))

			await context.repository.update(
				buildPlan({ id, name: "Renamed Plan", priceCents: 2990, isActive: false }),
			)

			const found = await context.repository.planOfId(id)
			expect(found?.name).toBe("Renamed Plan")
			expect(found?.priceCents).toBe(2990)
			expect(found?.isActive).toBe(false)
		})

		it("fetchPlans lists every plan and fetchActivePlans only the active ones", async () => {
			const active = buildPlan()
			const inactive = buildPlan({ isActive: false })
			await context.repository.save(active)
			await context.repository.save(inactive)
			const ours = new Set([active.id, inactive.id])

			const all = await context.repository.fetchPlans()
			const onlyActive = await context.repository.fetchActivePlans()

			expect(all.filter((plan) => ours.has(plan.id)).map((plan) => plan.id).sort()).toEqual(
				[active.id, inactive.id].sort(),
			)
			expect(
				onlyActive.filter((plan) => ours.has(plan.id)).map((plan) => plan.id),
			).toEqual([active.id])
		})

		it("planOfStripePriceId finds the plan by price id and ignores an empty price id", async () => {
			const plan = buildPlan()
			await context.repository.save(plan)

			const found = await context.repository.planOfStripePriceId(plan.stripePriceId)

			expect(found?.id).toBe(plan.id)
			expect(await context.repository.planOfStripePriceId("")).toBeNull()
		})
	})
}
```

`apps/backend/test/repository-contract/stripe-webhook-event-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

export interface StripeWebhookEventRepositoryContractContext {
	repository: StripeWebhookEventRepository
	newId(): string
	cleanup(): Promise<void>
}

export function describeStripeWebhookEventRepositoryContract(
	name: string,
	factory: () => Promise<StripeWebhookEventRepositoryContractContext>,
): void {
	describe(`StripeWebhookEventRepository contract (${name})`, () => {
		let context: StripeWebhookEventRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		it("marks different events as processed", async () => {
			await expect(
				context.repository.markAsProcessed(context.newId(), "invoice.paid"),
			).resolves.toBeUndefined()
			await expect(
				context.repository.markAsProcessed(context.newId(), "invoice.paid"),
			).resolves.toBeUndefined()
		})

		it("INV-07: marking the same event twice fails with DuplicateWebhookEventError", async () => {
			const eventId = context.newId()
			await context.repository.markAsProcessed(eventId, "invoice.paid")

			await expect(
				context.repository.markAsProcessed(eventId, "invoice.paid"),
			).rejects.toBeInstanceOf(DuplicateWebhookEventError)
		})
	})
}
```

`apps/backend/test/repository-contract/subscription-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

export interface SubscriptionRepositoryContractContext {
	repository: SubscriptionRepository
	newId(): string
	ensureReferences(references: { userIds: string[] }): Promise<void>
	cleanup(): Promise<void>
}

export type SubscriptionProps = Parameters<typeof Subscription.restore>[0]

export function buildSubscriptionProps(
	id: string,
	userId: string,
	overrides: Partial<SubscriptionProps> = {},
): SubscriptionProps {
	return {
		id,
		userId,
		billingSubscriptionId: `sub_${id}`,
		customerId: `cus_${userId}`,
		status: "active",
		currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		createdAt: new Date("2026-05-01T00:00:00.000Z"),
		updatedAt: new Date("2026-05-01T00:00:00.000Z"),
		...overrides,
	}
}

export function describeSubscriptionRepositoryContract(
	name: string,
	factory: () => Promise<SubscriptionRepositoryContractContext>,
): void {
	describe(`SubscriptionRepository contract (${name})`, () => {
		let context: SubscriptionRepositoryContractContext
		let userId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			await context.ensureReferences({ userIds: [userId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildSubscription(overrides: Partial<SubscriptionProps> = {}): Subscription {
			const id = overrides.id ?? context.newId()
			return Subscription.restore(buildSubscriptionProps(id, userId, overrides))
		}

		it("saves a subscription and finds it by billing id, customer id and user id", async () => {
			const subscription = buildSubscription()
			await context.repository.save(subscription)

			const byBilling = await context.repository.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)
			const byCustomer = await context.repository.ofCustomerId(subscription.customerId)
			const byUser = await context.repository.ofUserId(userId)

			expect(byBilling?.id).toBe(subscription.id)
			expect(byBilling?.status).toBe("active")
			expect(byBilling?.currentPeriodEnd.toISOString()).toBe("2026-06-01T00:00:00.000Z")
			expect(byBilling?.cancelAtPeriodEnd).toBe(false)
			expect(byCustomer?.id).toBe(subscription.id)
			expect(byUser?.id).toBe(subscription.id)
		})

		it("returns null when nothing matches", async () => {
			expect(await context.repository.ofBillingSubscriptionId(context.newId())).toBeNull()
			expect(await context.repository.ofCustomerId(context.newId())).toBeNull()
			expect(await context.repository.ofUserId(userId)).toBeNull()
		})

		it("ofUserId returns only the active subscription of the user", async () => {
			const canceled = buildSubscription({
				status: "canceled",
				canceledAt: new Date("2026-05-20T00:00:00.000Z"),
			})
			await context.repository.save(canceled)

			expect(await context.repository.ofUserId(userId)).toBeNull()
			expect((await context.repository.ofCustomerId(canceled.customerId))?.id).toBe(
				canceled.id,
			)
		})

		it("update persists status, cancel flag and canceled date", async () => {
			const id = context.newId()
			const original = buildSubscription({ id })
			await context.repository.save(original)

			await context.repository.update(
				buildSubscription({
					id,
					billingSubscriptionId: original.billingSubscriptionId,
					status: "canceled",
					cancelAtPeriodEnd: true,
					canceledAt: new Date("2026-05-20T00:00:00.000Z"),
				}),
			)

			const found = await context.repository.ofBillingSubscriptionId(
				original.billingSubscriptionId,
			)
			expect(found?.status).toBe("canceled")
			expect(found?.cancelAtPeriodEnd).toBe(true)
			expect(found?.canceledAt?.toISOString()).toBe("2026-05-20T00:00:00.000Z")
			expect(await context.repository.ofUserId(userId)).toBeNull()
		})
	})
}
```

Invocadores in-memory (unit):

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-plan-repository.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import { InMemoryPlanRepository } from "./in-memory-plan-repository"

describePlanRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryPlanRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-stripe-webhook-event-repository.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import { InMemoryStripeWebhookEventRepository } from "./in-memory-stripe-webhook-event-repository"

describeStripeWebhookEventRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryStripeWebhookEventRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeSubscriptionRepositoryContract } from "test/repository-contract/subscription-repository-contract"
import { InMemorySubscriptionRepository } from "./in-memory-subscription-repository"

describeSubscriptionRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemorySubscriptionRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
```

Invocadores Prisma (integração):

`apps/backend/src/shared/infra/database/repository/prisma/prisma-plan-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaPlanRepository } from "./prisma-plan-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describePlanRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaPlanRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.plan.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

`apps/backend/src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaStripeWebhookEventRepository } from "./prisma-stripe-webhook-event-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeStripeWebhookEventRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaStripeWebhookEventRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.stripeWebhookEvent.deleteMany({
				where: { event_id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

`apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { describeSubscriptionRepositoryContract } from "test/repository-contract/subscription-repository-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaSubscriptionRepository } from "./prisma-subscription-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeSubscriptionRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaSubscriptionRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: ({ userIds }) => seeder.ensureUsers(userIds),
		cleanup: () => seeder.cleanup(),
	}
})
```

Mongo, plano — `apps/backend/src/shared/infra/database/repository/mongo/mongo-plan-repository.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { Plan } from "@/subscription/domain/plan"
import { MongoPlanRepository } from "./mongo-plan-repository"

describe("MongoPlanRepository", () => {
	let connection: MongoConnection
	let repository: MongoPlanRepository
	const recorder = new IdRecorder()

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoPlanRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describePlanRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoPlanRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.PLANS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(async () => {
			await deleteDocumentsReferencing(connection, recorder.ids, [
				{ collection: COLLECTIONS.PLANS, fields: ["_id"] },
			])
		})

		it("stores the document with the Prisma column names and the features array", async () => {
			const id = recorder.newId()
			await repository.save(
				Plan.restore({
					id,
					name: "Mongo Plan",
					priceCents: 4990,
					billingPeriod: "yearly",
					tagline: "tag",
					features: ["a", "b"],
					isActive: true,
					stripePriceId: `price_${id}`,
				}),
			)

			const document = await connection
				.collection<Document>(COLLECTIONS.PLANS)
				.findOne({ _id: id })

			expect(document).toMatchObject({
				_id: id,
				name: "Mongo Plan",
				price_cents: 4990,
				billing_period: "yearly",
				tagline: "tag",
				features: ["a", "b"],
				is_active: true,
				stripe_price_id: `price_${id}`,
			})
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})
	})
})
```

Mongo, webhook — `mongo-stripe-webhook-event-repository.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { MongoStripeWebhookEventRepository } from "./mongo-stripe-webhook-event-repository"

describe("MongoStripeWebhookEventRepository", () => {
	let connection: MongoConnection
	let repository: MongoStripeWebhookEventRepository
	const recorder = new IdRecorder()

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.STRIPE_WEBHOOK_EVENTS, fields: ["event_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoStripeWebhookEventRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeStripeWebhookEventRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoStripeWebhookEventRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.STRIPE_WEBHOOK_EVENTS, fields: ["event_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-07: the unique index rejects a second document with the same event_id", async () => {
			const eventId = recorder.newId()
			const events = connection.collection<Document>(COLLECTIONS.STRIPE_WEBHOOK_EVENTS)
			await events.insertOne({ _id: randomUUID(), event_id: eventId })

			const error = await events
				.insertOne({ _id: randomUUID(), event_id: eventId })
				.then(
					() => undefined,
					(caught: unknown) => caught,
				)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["event_id"])
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("a rolled back transaction leaves the event unmarked so it can be processed again", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const eventId = recorder.newId()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository
						.withTransaction(tx)
						.markAsProcessed(eventId, "invoice.paid")
					throw new Error("worker failed")
				}),
			).rejects.toThrow("worker failed")

			await expect(
				repository.markAsProcessed(eventId, "invoice.paid"),
			).resolves.toBeUndefined()
		})
	})
})
```

Mongo, assinatura — `mongo-subscription-repository.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	buildSubscriptionProps,
	describeSubscriptionRepositoryContract,
	type SubscriptionProps,
} from "test/repository-contract/subscription-repository-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import { MongoSubscriptionRepository } from "./mongo-subscription-repository"

describe("MongoSubscriptionRepository", () => {
	let connection: MongoConnection
	let repository: MongoSubscriptionRepository
	const recorder = new IdRecorder()

	function buildSubscription(
		userId: string,
		overrides: Partial<SubscriptionProps> = {},
	): Subscription {
		const id = overrides.id ?? recorder.newId()
		return Subscription.restore(buildSubscriptionProps(id, userId, overrides))
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.SUBSCRIPTIONS, fields: ["_id", "user_id"] },
		])
	}

	async function caughtError(operation: Promise<unknown>): Promise<unknown> {
		return operation.then(
			() => undefined,
			(caught: unknown) => caught,
		)
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoSubscriptionRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeSubscriptionRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoSubscriptionRepository(connection),
			newId: () => contractRecorder.newId(),
			ensureReferences: async () => {},
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.SUBSCRIPTIONS, fields: ["_id", "user_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-03: the partial unique index rejects a second active subscription of the same user with ActiveSubscriptionAlreadyExistsError", async () => {
			const userId = recorder.newId()
			await repository.save(buildSubscription(userId))

			const error = await caughtError(repository.save(buildSubscription(userId)))

			expect(error).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
			if (!(error instanceof ActiveSubscriptionAlreadyExistsError)) return
			const cause = error.cause
			expect(isDuplicateKeyError(cause)).toBe(true)
			if (!isDuplicateKeyError(cause)) return
			expect(duplicateKeyFields(cause)).toEqual(["user_id"])
		})

		it("INV-03: a canceled subscription and a new active one coexist for the same user", async () => {
			const userId = recorder.newId()
			await repository.save(buildSubscription(userId, { status: "canceled" }))

			await expect(repository.save(buildSubscription(userId))).resolves.toBeUndefined()
		})

		it("INV-02: the unique index rejects a second subscription with the same billing subscription id", async () => {
			const first = buildSubscription(recorder.newId())
			await repository.save(first)

			const error = await caughtError(
				repository.save(
					buildSubscription(recorder.newId(), {
						billingSubscriptionId: first.billingSubscriptionId,
					}),
				),
			)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["billing_subscription_id"])
		})

		it("INV-04: closing the expired subscription and creating the new one commit together", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const userId = recorder.newId()
			const expired = buildSubscription(userId, {
				currentPeriodEnd: new Date("2026-05-31T00:00:00.000Z"),
			})
			await repository.save(expired)
			const closed = buildSubscription(userId, {
				id: expired.id,
				billingSubscriptionId: expired.billingSubscriptionId,
				status: "canceled",
				canceledAt: new Date("2026-06-01T00:00:00.000Z"),
			})
			const renewed = buildSubscription(userId)

			await unitOfWork.runTransaction(async (tx) => {
				const transactional = repository.withTransaction(tx)
				await transactional.update(closed)
				await transactional.save(renewed)
			})

			expect((await repository.ofUserId(userId))?.id).toBe(renewed.id)
			expect(
				(await repository.ofBillingSubscriptionId(expired.billingSubscriptionId))
					?.status,
			).toBe("canceled")
		})

		it("INV-04: when creating the new subscription fails, the expired one stays active", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const userId = recorder.newId()
			const expired = buildSubscription(userId)
			await repository.save(expired)
			const closed = buildSubscription(userId, {
				id: expired.id,
				billingSubscriptionId: expired.billingSubscriptionId,
				status: "canceled",
				canceledAt: new Date("2026-06-01T00:00:00.000Z"),
			})
			const clashingRenewal = buildSubscription(userId, {
				billingSubscriptionId: expired.billingSubscriptionId,
			})

			const error = await caughtError(
				unitOfWork.runTransaction(async (tx) => {
					const transactional = repository.withTransaction(tx)
					await transactional.update(closed)
					await transactional.save(clashingRenewal)
				}),
			)

			expect(isDuplicateKeyError(error)).toBe(true)
			expect((await repository.ofUserId(userId))?.id).toBe(expired.id)
			expect(
				(await repository.ofBillingSubscriptionId(expired.billingSubscriptionId))
					?.status,
			).toBe("active")
		})

		it("update writes only status, plan, cancel flag, canceled date and updated date", async () => {
			const userId = recorder.newId()
			const original = buildSubscription(userId)
			await repository.save(original)

			await repository.update(
				buildSubscription(userId, {
					id: original.id,
					billingSubscriptionId: "sub_other",
					customerId: "cus_other",
					status: "past_due",
				}),
			)

			const document = await connection
				.collection<Document>(COLLECTIONS.SUBSCRIPTIONS)
				.findOne({ _id: original.id })
			expect(document).toMatchObject({
				status: "past_due",
				billing_subscription_id: original.billingSubscriptionId,
				customer_id: original.customerId,
			})
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})
	})
})
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-plan-repository.contract.test.ts`
Expected: PASS (5 testes) se o in-memory já cumpre o contrato; falhas são divergências do in-memory e se corrigem lá.

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-stripe-webhook-event-repository.contract.test.ts`
Expected: PASS (2 testes)

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.contract.test.ts`
Expected: FAIL no teste `update persists status, cancel flag and canceled date`: o `InMemorySubscriptionRepository.update` apenas faz `data.add(subscription)`; como o contrato passa uma instância nova com o mesmo id, o conjunto guarda as duas e `ofBillingSubscriptionId` devolve a antiga (`status` continua `active`).

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-plan-repository.contract.integration-test.ts`
Expected: PASS (5 testes) se o contrato descreve o comportamento atual do Prisma

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository.contract.integration-test.ts`
Expected: PASS (2 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-subscription-repository.contract.integration-test.ts`
Expected: PASS (4 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-plan-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-plan-repository""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-stripe-webhook-event-repository""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-subscription-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-subscription-repository""

- **Step 4: Fix the in-memory subscription update at its root**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`, `update` passa a substituir pelo id, como o `InMemoryPlanRepository` já faz:

```ts
	public async update(subscription: Subscription): Promise<void> {
		const existing = this.data.find((current) => current.id === subscription.id)
		if (existing) this.data.delete(existing)
		this.data.add(subscription)
	}
```

- **Step 5: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-plan-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ClientSession, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"

export type PlanDocument = {
	_id: string
	name: string
	price_cents: number
	billing_period: BillingPeriod
	tagline: string
	features: string[]
	is_active: boolean
	stripe_price_id: string | null
	created_at: Date
	updated_at: Date
}

@injectable()
export class MongoPlanRepository implements PlanRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): PlanRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoPlanRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		const now = new Date()
		await this.plans().insertOne(
			{
				_id: plan.id,
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
				created_at: now,
				updated_at: now,
			},
			sessionOptions(this.session),
		)
		return { id: plan.id }
	}

	public async update(plan: Plan): Promise<void> {
		await this.plans().updateOne(
			{ _id: plan.id },
			{
				$set: {
					name: plan.name,
					price_cents: plan.priceCents,
					billing_period: plan.billingPeriod,
					tagline: plan.tagline,
					features: [...plan.features],
					is_active: plan.isActive,
					stripe_price_id: plan.stripePriceId,
					updated_at: new Date(),
				},
			},
			sessionOptions(this.session),
		)
	}

	public async planOfId(id: string): Promise<Plan | null> {
		const document = await this.plans().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		return document ? this.createPlan(document) : null
	}

	public async fetchPlans(): Promise<Plan[]> {
		const documents = await this.plans()
			.find({}, sessionOptions(this.session))
			.sort({ created_at: 1, _id: 1 })
			.toArray()
		return documents.map((document) => this.createPlan(document))
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		const documents = await this.plans()
			.find({ is_active: true }, sessionOptions(this.session))
			.sort({ created_at: 1, _id: 1 })
			.toArray()
		return documents.map((document) => this.createPlan(document))
	}

	public async planOfStripePriceId(priceId: string): Promise<Plan | null> {
		if (!priceId) return null
		const document = await this.plans().findOne(
			{ stripe_price_id: priceId },
			sessionOptions(this.session),
		)
		return document ? this.createPlan(document) : null
	}

	private plans(): Collection<PlanDocument> {
		return this.connection.collection<PlanDocument>(COLLECTIONS.PLANS)
	}

	private createPlan(document: PlanDocument): Plan {
		return Plan.restore({
			id: document._id,
			name: document.name,
			priceCents: document.price_cents,
			billingPeriod: document.billing_period,
			tagline: document.tagline,
			features: document.features,
			isActive: document.is_active,
			stripePriceId: document.stripe_price_id ?? "",
		})
	}
}
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.ts`:

```ts
import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import type { ClientSession, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

export type StripeWebhookEventDocument = {
	_id: string
	event_id: string
	event_type: string
	processed_at: Date
}

@injectable()
export class MongoStripeWebhookEventRepository
	implements StripeWebhookEventRepository
{
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(
		tx: TX,
	): StripeWebhookEventRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoStripeWebhookEventRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async markAsProcessed(
		eventId: string,
		eventType: string,
	): Promise<void> {
		try {
			await this.events().insertOne(
				{
					_id: randomUUID(),
					event_id: eventId,
					event_type: eventType,
					processed_at: new Date(),
				},
				sessionOptions(this.session),
			)
		} catch (error) {
			if (isDuplicateKeyError(error) && duplicateKeyFields(error).includes("event_id")) {
				throw new DuplicateWebhookEventError(eventId)
			}
			throw error
		}
	}

	private events(): Collection<StripeWebhookEventDocument> {
		return this.connection.collection<StripeWebhookEventDocument>(
			COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
		)
	}
}
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-subscription-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ClientSession, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionStatusTypes } from "@/subscription/domain/subscription-status-types"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

export type SubscriptionDocument = {
	_id: string
	user_id: string
	billing_subscription_id: string
	customer_id: string
	status: SubscriptionStatusTypes
	canceled_at: Date | null
	created_at: Date
	updated_at: Date
	plan_id: string | null
	current_period_start: Date
	current_period_end: Date
	cancel_at_period_end: boolean
}

@injectable()
export class MongoSubscriptionRepository implements SubscriptionRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): SubscriptionRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoSubscriptionRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(subscription: Subscription): Promise<void> {
		try {
			await this.subscriptions().insertOne(
				{
					_id: subscription.id,
					user_id: subscription.userId,
					billing_subscription_id: subscription.billingSubscriptionId,
					customer_id: subscription.customerId,
					status: subscription.status,
					canceled_at: subscription.canceledAt ?? null,
					created_at: subscription.createdAt,
					updated_at: new Date(),
					plan_id: subscription.planId ?? null,
					current_period_start: subscription.currentPeriodStart,
					current_period_end: subscription.currentPeriodEnd,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
				},
				sessionOptions(this.session),
			)
		} catch (error) {
			if (isDuplicateKeyError(error) && duplicateKeyFields(error).includes("user_id")) {
				throw new ActiveSubscriptionAlreadyExistsError({ cause: error })
			}
			throw error
		}
	}

	public async update(subscription: Subscription): Promise<void> {
		await this.subscriptions().updateOne(
			{ _id: subscription.id },
			{
				$set: {
					status: subscription.status,
					plan_id: subscription.planId ?? null,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
					canceled_at: subscription.canceledAt ?? null,
					updated_at: subscription.updatedAt ?? new Date(),
				},
			},
			sessionOptions(this.session),
		)
	}

	public async ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ billing_subscription_id: billingSubscriptionId },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	public async ofCustomerId(customerId: string): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ customer_id: customerId },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		const document = await this.subscriptions().findOne(
			{ user_id: userId, status: "active" },
			sessionOptions(this.session),
		)
		return document ? this.restore(document) : null
	}

	private subscriptions(): Collection<SubscriptionDocument> {
		return this.connection.collection<SubscriptionDocument>(
			COLLECTIONS.SUBSCRIPTIONS,
		)
	}

	private restore(document: SubscriptionDocument): Subscription {
		return Subscription.restore({
			id: document._id,
			userId: document.user_id,
			billingSubscriptionId: document.billing_subscription_id,
			customerId: document.customer_id,
			status: document.status,
			planId: document.plan_id ?? undefined,
			currentPeriodStart: document.current_period_start,
			currentPeriodEnd: document.current_period_end,
			cancelAtPeriodEnd: document.cancel_at_period_end,
			canceledAt: document.canceled_at ?? undefined,
			createdAt: document.created_at,
			updatedAt: document.updated_at,
		})
	}
}
```

- **Step 6: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.contract.test.ts`
Expected: PASS (4 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-plan-repository.integration-test.ts`
Expected: PASS (7 testes: 5 do contrato e 2 específicos)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`
Expected: PASS (5 testes: 2 do contrato e 3 específicos)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-subscription-repository.integration-test.ts`
Expected: PASS (11 testes: 4 do contrato e 7 específicos)

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database/repository apps/backend/test/repository-contract
git commit -m "feat(backend): repositórios de plano, webhook Stripe e assinatura no Mongo"
```

## Critérios de Sucesso

- INV-03 [db]: Um usuário tem no máximo uma assinatura ativa · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-subscription-repository.integration-test.ts`
- INV-04 [int]: Encerrar a assinatura expirada e criar a nova ocorre numa transação · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-subscription-repository.integration-test.ts`
- INV-07 [db]: `StripeWebhookEvent.event_id` único: o mesmo evento processa uma vez · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`
- FR-004, FR-007: os três repositórios cumprem as portas `PlanRepository`, `StripeWebhookEventRepository` e `SubscriptionRepository`; o 11000 vira `ActiveSubscriptionAlreadyExistsError` (campo `user_id`, com o erro do driver em `cause`) e `DuplicateWebhookEventError` (campo `event_id`); `billing_subscription_id` repetido sobe como erro de chave duplicada, como no Prisma.
- FR-008: `withTransaction(session)` faz as escritas de assinatura e de evento participarem do `MongoUnitOfWork`; falhar no meio desfaz tudo (testes `INV-04` e o de evento desmarcado).
- `describePlanRepositoryContract`, `describeStripeWebhookEventRepositoryContract` e `describeSubscriptionRepositoryContract` passam em in-memory, Prisma e Mongo.
