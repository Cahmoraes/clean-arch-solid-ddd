# Task 11: Seleção de adapters por DATABASE_PROVIDER nos providers e no IoC [FR-001, FR-002, FR-003]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** capable

## Visão Geral

Esta task liga tudo: cada `*RepositoryProvider`, o provider do `UnitOfWork`, os DAOs, os repositórios de analytics, o provider de destinatários e o health check passam a escolher o adapter Mongo quando `DATABASE_PROVIDER=mongo` (em produção), sem mudar o comportamento atual dos demais casos (Prisma por padrão; in-memory fora de produção). O `MongoConnection` só é registrado no container quando o provider é `mongo`, conecta, valida transações e cria os índices na inicialização da API (que não sobe se falhar) e desconecta no encerramento. Um único banco fica ativo por processo.

## Arquivos

- Create: `apps/backend/src/bootstrap/database-lifecycle.ts`
- Create: `apps/backend/src/shared/infra/database/connection/mongo/initialize-mongo.ts`
- Create: `apps/backend/src/shared/infra/health/database/database-health-provider-resolver.ts`
- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/health-check/heath-check-module.ts`
- Modify: `apps/backend/src/bootstrap/server-build.ts`
- Modify: `apps/backend/src/main.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/unit-of-work/unit-of-work-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-dao-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-activity-dao-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-activity-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/gym/gym-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/check-in/check-in-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/plan-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/stripe-webhook-event-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/analytics/analytics-user-repository-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/analytics/analytics-check-in-repository-provider.ts`
- Modify: `apps/backend/src/notification/infra/repository/notification-repository-provider.ts`
- Modify: `apps/backend/src/notification/infra/provider/active-recipients-provider-resolver.ts`
- Test: `apps/backend/src/shared/infra/env/is-mongo-enabled.test.ts`
- Test: `apps/backend/src/shared/infra/ioc/module/database-provider-selection.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/connection/mongo/initialize-mongo.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { connect(): Promise<void>; assertTransactionsSupported(): Promise<void>; ensureIndexes(): Promise<void>; disconnect(): Promise<void> }` e `class MongoUnavailableError` (`@/shared/infra/errors/mongo-unavailable-error`) (task-02)
  - `class MongoDatabaseHealthProvider` de `@/shared/infra/health/database/mongo-database-health-provider` e `SHARED_TYPES.Mongo.Connection` / `SHARED_TYPES.Mongo.UnitOfWork` de `@/shared/infra/ioc/types` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `class MongoUnitOfWork implements UnitOfWork` de `@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work` (task-03)
  - `class MongoUserRepository`, `class MongoUserDao` (`@/shared/infra/database/repository/mongo/mongo-user-repository`, `@/shared/infra/database/dao/mongo/mongo-user-dao`) (task-04)
  - `class MongoGymRepository` de `@/shared/infra/database/repository/mongo/mongo-gym-repository` (task-05)
  - `class MongoCheckInRepository` de `@/shared/infra/database/repository/mongo/mongo-check-in-repository` (task-06)
  - `class MongoPlanRepository`, `class MongoStripeWebhookEventRepository`, `class MongoSubscriptionRepository` de `@/shared/infra/database/repository/mongo/mongo-plan-repository`, `.../mongo-stripe-webhook-event-repository`, `.../mongo-subscription-repository` (task-07)
  - `class MongoNotificationRepository` de `@/notification/infra/repository/mongo/mongo-notification.repository` e `class MongoActiveRecipientsProvider` de `@/notification/infra/provider/mongo/mongo-active-recipients.provider` (task-08)
  - `class MongoUserActivityRepository` de `@/shared/infra/database/repository/mongo/mongo-user-activity-repository` e `class MongoUserActivityDao` de `@/shared/infra/database/dao/mongo/mongo-user-activity-dao` (task-09)
  - `class MongoAnalyticsCheckInRepository`, `class MongoAnalyticsUserRepository` de `@/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository` e `.../mongo-analytics-user-repository` (task-10)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` (task-04) e `deleteDocumentsReferencing(connection, ids, targets)` (task-04) para limpar os documentos do teste de fluxo
- **Produz:**
  - `isMongoEnabled(): boolean` em `@/shared/infra/env` (`true` só em produção com `DATABASE_PROVIDER=mongo`)
  - `initializeMongo(connection: MongoConnection): Promise<void>` em `@/shared/infra/database/connection/mongo/initialize-mongo` (conecta, valida transações, cria índices)
  - `startDatabase(): Promise<void>` e `stopDatabase(): Promise<void>` em `@/bootstrap/database-lifecycle`
  - `DatabaseHealthProviderResolver.provide(context: ResolutionContext): HealthProvider` em `@/shared/infra/health/database/database-health-provider-resolver`
  - Todos os `*Provider.provide(context)` existentes mantêm a assinatura e passam a devolver o adapter Mongo quando `isMongoEnabled()`

### Skills a invocar

- `typescript-advanced`: o helper de teste `resolveWith<T>(container, provide)` e o `expectAdapter` usam genéricos e construtores abstratos em vez de `any`; o retorno de cada `provide` continua sendo a porta, não a classe concreta.
- `no-workarounds`: a decisão fica numa única função (`isMongoEnabled`), não em `process.env` lido em cada provider; fora de produção o in-memory continua valendo e o health check do Prisma não muda sem o provider `mongo`.
- `test-antipatterns`: o teste de seleção usa um container real do inversify com a conexão Mongo real e os módulos recarregados com `vi.resetModules()` e `vi.stubEnv`; nada de mockar os providers nem de checar nome de classe por string.

## Passos

- **Step 1: Write the failing tests**

`apps/backend/src/shared/infra/env/is-mongo-enabled.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"

const MONGO_URL =
	"mongodb://localhost:27017/test?replicaSet=rs0&directConnection=true"

async function loadIsMongoEnabled(): Promise<() => boolean> {
	vi.resetModules()
	const module = await import("./index")
	return module.isMongoEnabled
}

describe("isMongoEnabled", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})

	it("FR-001: is true in production with DATABASE_PROVIDER=mongo", async () => {
		vi.stubEnv("NODE_ENV", "production")
		vi.stubEnv("DATABASE_PROVIDER", "mongo")
		vi.stubEnv("DATABASE_URL_MONGO", MONGO_URL)

		expect((await loadIsMongoEnabled())()).toBe(true)
	})

	it("FR-003: is false in production with the default provider prisma", async () => {
		vi.stubEnv("NODE_ENV", "production")
		vi.stubEnv("DATABASE_PROVIDER", "prisma")

		expect((await loadIsMongoEnabled())()).toBe(false)
	})

	it("is false outside production even with DATABASE_PROVIDER=mongo, so the in-memory adapters keep working in tests", async () => {
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("DATABASE_PROVIDER", "mongo")
		vi.stubEnv("DATABASE_URL_MONGO", MONGO_URL)

		expect((await loadIsMongoEnabled())()).toBe(false)
	})
})
```

`apps/backend/src/shared/infra/database/connection/mongo/initialize-mongo.integration-test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"
import { env } from "@/shared/infra/env"
import { initializeMongo } from "./initialize-mongo"

describe("initializeMongo", () => {
	const opened: MongoConnection[] = []

	afterEach(async () => {
		await Promise.all(opened.splice(0).map((connection) => connection.disconnect()))
	})

	it("connects, validates transactions and creates the indexes on a replica set", async () => {
		const connection = new MongoConnection(env.DATABASE_URL_MONGO ?? "")
		opened.push(connection)

		await expect(initializeMongo(connection)).resolves.toBeUndefined()

		const indexes = await connection.collection("users").indexes()
		expect(indexes.map((index) => index.name)).toContain("users_email_unique")
	})

	it("AC-05: rejects, so the API does not start, when MongoDB is unreachable", async () => {
		const connection = new MongoConnection(
			"mongodb://127.0.0.1:1/test?directConnection=true",
		)
		opened.push(connection)

		await expect(initializeMongo(connection)).rejects.toBeInstanceOf(
			MongoUnavailableError,
		)
	}, 20_000)
})
```

`apps/backend/src/shared/infra/ioc/module/database-provider-selection.integration-test.ts`:

```ts
import { Container, type ResolutionContext } from "inversify"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { CheckIn } from "@/check-in/domain/check-in"
import { Gym } from "@/gym/domain/gym"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { Plan } from "@/subscription/domain/plan"
import { Subscription } from "@/subscription/domain/subscription"
import { User } from "@/user/domain/user"

type Provide<T> = (context: ResolutionContext) => T
type AnyClass = abstract new (...args: never[]) => unknown

function resolveWith<T>(container: Container, provide: Provide<T>): T {
	const identifier = Symbol("probe")
	container.bind(identifier).toDynamicValue((context) => provide(context))
	return container.get<T>(identifier)
}

function expectAdapter<T>(
	container: Container,
	provide: Provide<T>,
	adapter: AnyClass,
): void {
	expect(resolveWith(container, provide)).toBeInstanceOf(adapter)
}

describe("provider selection by DATABASE_PROVIDER", () => {
	let connection: MongoConnection
	let container: Container

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	beforeEach(() => {
		vi.resetModules()
		container = new Container()
		container.bind(SHARED_TYPES.Mongo.Connection).toConstantValue(connection)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe("DATABASE_PROVIDER=mongo in production", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production")
			vi.stubEnv("DATABASE_PROVIDER", "mongo")
		})

		const cases: {
			name: string
			check: (container: Container) => Promise<void>
		}[] = [
			{
				name: "user repository",
				check: async (c) => {
					const { UserRepositoryProvider } = await import("@/shared/infra/ioc/module/user/user-repository-provider")
					const { MongoUserRepository } = await import("@/shared/infra/database/repository/mongo/mongo-user-repository")
					expectAdapter(c, UserRepositoryProvider.provide, MongoUserRepository)
				},
			},
			{
				name: "user DAO",
				check: async (c) => {
					const { UserDAOProvider } = await import("@/shared/infra/ioc/module/user/user-dao-provider")
					const { MongoUserDao } = await import("@/shared/infra/database/dao/mongo/mongo-user-dao")
					expectAdapter(c, UserDAOProvider.provide, MongoUserDao)
				},
			},
			{
				name: "user activity DAO",
				check: async (c) => {
					const { UserActivityDaoProvider } = await import("@/shared/infra/ioc/module/user/user-activity-dao-provider")
					const { MongoUserActivityDao } = await import("@/shared/infra/database/dao/mongo/mongo-user-activity-dao")
					expectAdapter(c, UserActivityDaoProvider.provide, MongoUserActivityDao)
				},
			},
			{
				name: "user activity repository",
				check: async (c) => {
					const { UserActivityRepositoryProvider } = await import("@/shared/infra/ioc/module/user/user-activity-repository-provider")
					const { MongoUserActivityRepository } = await import("@/shared/infra/database/repository/mongo/mongo-user-activity-repository")
					expectAdapter(c, UserActivityRepositoryProvider.provide, MongoUserActivityRepository)
				},
			},
			{
				name: "gym repository",
				check: async (c) => {
					const { GymRepositoryProvider } = await import("@/shared/infra/ioc/module/gym/gym-repository-provider")
					const { MongoGymRepository } = await import("@/shared/infra/database/repository/mongo/mongo-gym-repository")
					expectAdapter(c, GymRepositoryProvider.provide, MongoGymRepository)
				},
			},
			{
				name: "check-in repository",
				check: async (c) => {
					const { CheckInRepositoryProvider } = await import("@/shared/infra/ioc/module/check-in/check-in-repository-provider")
					const { MongoCheckInRepository } = await import("@/shared/infra/database/repository/mongo/mongo-check-in-repository")
					expectAdapter(c, CheckInRepositoryProvider.provide, MongoCheckInRepository)
				},
			},
			{
				name: "subscription repository",
				check: async (c) => {
					const { SubscriptionRepositoryProvider } = await import("@/shared/infra/ioc/module/subscription/subscription-repository-provider")
					const { MongoSubscriptionRepository } = await import("@/shared/infra/database/repository/mongo/mongo-subscription-repository")
					expectAdapter(c, SubscriptionRepositoryProvider.provide, MongoSubscriptionRepository)
				},
			},
			{
				name: "plan repository",
				check: async (c) => {
					const { PlanRepositoryProvider } = await import("@/shared/infra/ioc/module/subscription/plan-repository-provider")
					const { MongoPlanRepository } = await import("@/shared/infra/database/repository/mongo/mongo-plan-repository")
					expectAdapter(c, PlanRepositoryProvider.provide, MongoPlanRepository)
				},
			},
			{
				name: "Stripe webhook event repository",
				check: async (c) => {
					const { StripeWebhookEventRepositoryProvider } = await import("@/shared/infra/ioc/module/subscription/stripe-webhook-event-repository-provider")
					const { MongoStripeWebhookEventRepository } = await import("@/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository")
					expectAdapter(c, StripeWebhookEventRepositoryProvider.provide, MongoStripeWebhookEventRepository)
				},
			},
			{
				name: "notification repository",
				check: async (c) => {
					const { NotificationRepositoryProvider } = await import("@/notification/infra/repository/notification-repository-provider")
					const { MongoNotificationRepository } = await import("@/notification/infra/repository/mongo/mongo-notification.repository")
					expectAdapter(c, NotificationRepositoryProvider.provide, MongoNotificationRepository)
				},
			},
			{
				name: "active recipients provider",
				check: async (c) => {
					const { ActiveRecipientsProviderResolver } = await import("@/notification/infra/provider/active-recipients-provider-resolver")
					const { MongoActiveRecipientsProvider } = await import("@/notification/infra/provider/mongo/mongo-active-recipients.provider")
					expectAdapter(c, ActiveRecipientsProviderResolver.provide, MongoActiveRecipientsProvider)
				},
			},
			{
				name: "analytics user repository",
				check: async (c) => {
					const { AnalyticsUserRepositoryProvider } = await import("@/shared/infra/ioc/module/analytics/analytics-user-repository-provider")
					const { MongoAnalyticsUserRepository } = await import("@/shared/infra/database/repository/mongo/mongo-analytics-user-repository")
					expectAdapter(c, AnalyticsUserRepositoryProvider.provide, MongoAnalyticsUserRepository)
				},
			},
			{
				name: "analytics check-in repository",
				check: async (c) => {
					const { AnalyticsCheckInRepositoryProvider } = await import("@/shared/infra/ioc/module/analytics/analytics-check-in-repository-provider")
					const { MongoAnalyticsCheckInRepository } = await import("@/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository")
					expectAdapter(c, AnalyticsCheckInRepositoryProvider.provide, MongoAnalyticsCheckInRepository)
				},
			},
			{
				name: "unit of work",
				check: async (c) => {
					const { UnitOfWorkProvider } = await import("@/shared/infra/database/repository/unit-of-work/unit-of-work-provider")
					const { MongoUnitOfWork } = await import("@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work")
					expectAdapter(c, UnitOfWorkProvider.provide, MongoUnitOfWork)
				},
			},
			{
				name: "database health provider",
				check: async (c) => {
					const { DatabaseHealthProviderResolver } = await import("@/shared/infra/health/database/database-health-provider-resolver")
					const { MongoDatabaseHealthProvider } = await import("@/shared/infra/health/database/mongo-database-health-provider")
					expectAdapter(c, DatabaseHealthProviderResolver.provide, MongoDatabaseHealthProvider)
				},
			},
		]

		it.each(cases)("FR-001, FR-002: the $name resolves to the Mongo adapter", async ({ check }) => {
			await check(container)
		})
	})

	describe("DATABASE_PROVIDER=prisma (default) in production", () => {
		beforeEach(async () => {
			vi.stubEnv("NODE_ENV", "production")
			vi.stubEnv("DATABASE_PROVIDER", "prisma")
			const { prismaClient } = await import("@/shared/infra/database/connection/prisma-client.js")
			container.bind(SHARED_TYPES.Prisma.Client).toConstantValue(prismaClient)
		})

		afterAll(async () => {
			const { prismaClient } = await import("@/shared/infra/database/connection/prisma-client.js")
			await prismaClient.$disconnect()
		})

		it("FR-003: the user repository stays Prisma", async () => {
			const { UserRepositoryProvider } = await import("@/shared/infra/ioc/module/user/user-repository-provider")
			const { PrismaUserRepository } = await import("@/shared/infra/database/repository/prisma/prisma-user-repository")
			expectAdapter(container, UserRepositoryProvider.provide, PrismaUserRepository)
		})

		it("FR-003: the gym repository stays Prisma", async () => {
			const { GymRepositoryProvider } = await import("@/shared/infra/ioc/module/gym/gym-repository-provider")
			const { PrismaGymRepository } = await import("@/shared/infra/database/repository/prisma/prisma-gym-repository")
			expectAdapter(container, GymRepositoryProvider.provide, PrismaGymRepository)
		})

		it("FR-003: the unit of work stays Prisma", async () => {
			const { UnitOfWorkProvider } = await import("@/shared/infra/database/repository/unit-of-work/unit-of-work-provider")
			const { PrismaUnitOfWork } = await import("@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work")
			expectAdapter(container, UnitOfWorkProvider.provide, PrismaUnitOfWork)
		})

		it("FR-003: the database health provider stays Prisma", async () => {
			const { DatabaseHealthProviderResolver } = await import("@/shared/infra/health/database/database-health-provider-resolver")
			const { DatabaseHealthProvider } = await import("@/shared/infra/health/database/database-health-provider")
			expectAdapter(container, DatabaseHealthProviderResolver.provide, DatabaseHealthProvider)
		})
	})

	describe("outside production", () => {
		it("keeps the in-memory adapters even when DATABASE_PROVIDER=mongo", async () => {
			vi.stubEnv("NODE_ENV", "test")
			vi.stubEnv("DATABASE_PROVIDER", "mongo")
			const { GymRepositoryProvider } = await import("@/shared/infra/ioc/module/gym/gym-repository-provider")
			const { InMemoryGymRepository } = await import("@/shared/infra/database/repository/in-memory/in-memory-gym-repository")

			expectAdapter(container, GymRepositoryProvider.provide, InMemoryGymRepository)
		})
	})

	describe("flows through the providers with DATABASE_PROVIDER=mongo", () => {
		const recorder = new IdRecorder()

		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production")
			vi.stubEnv("DATABASE_PROVIDER", "mongo")
		})

		afterEach(async () => {
			await deleteDocumentsReferencing(connection, recorder.ids, [
				{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
				{ collection: COLLECTIONS.CHECK_INS, fields: ["_id", "user_id"] },
				{ collection: COLLECTIONS.PLANS, fields: ["_id"] },
				{ collection: COLLECTIONS.SUBSCRIPTIONS, fields: ["_id", "user_id"] },
			])
		})

		it("AC-01: user, gym, check-in and subscription persistence flows run against MongoDB", async () => {
			const { UserRepositoryProvider } = await import("@/shared/infra/ioc/module/user/user-repository-provider")
			const { GymRepositoryProvider } = await import("@/shared/infra/ioc/module/gym/gym-repository-provider")
			const { CheckInRepositoryProvider } = await import("@/shared/infra/ioc/module/check-in/check-in-repository-provider")
			const { PlanRepositoryProvider } = await import("@/shared/infra/ioc/module/subscription/plan-repository-provider")
			const { SubscriptionRepositoryProvider } = await import("@/shared/infra/ioc/module/subscription/subscription-repository-provider")
			const { UnitOfWorkProvider } = await import("@/shared/infra/database/repository/unit-of-work/unit-of-work-provider")
			const users = resolveWith(container, UserRepositoryProvider.provide)
			const gyms = resolveWith(container, GymRepositoryProvider.provide)
			const checkIns = resolveWith(container, CheckInRepositoryProvider.provide)
			const plans = resolveWith(container, PlanRepositoryProvider.provide)
			const subscriptions = resolveWith(container, SubscriptionRepositoryProvider.provide)
			const unitOfWork = resolveWith(container, UnitOfWorkProvider.provide)

			const userId = recorder.newId()
			const gymId = recorder.newId()
			const planId = recorder.newId()
			const createdAt = new Date("2026-05-10T15:00:00.000Z")

			// create user
			await users.save(
				User.restore({
					id: userId,
					name: "Flow User",
					email: `${userId}@flow.test`,
					password: "hashed-password",
					createdAt,
					updatedAt: createdAt,
					role: "MEMBER",
					status: "activated",
					isSuperAdmin: false,
				}),
			)
			expect((await users.userOfEmail(`${userId}@flow.test`))?.id).toBe(userId)

			// create gym and find it nearby
			await gyms.save(
				Gym.restore({
					id: gymId,
					title: "Flow Gym",
					description: "flow",
					phone: "+5511999999999",
					address: "Rua do Fluxo, 1",
					latitude: -45,
					longitude: -45,
					cnpj: Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(""),
					status: "activated",
					operatingHours: null,
				}),
			)
			const nearby = await gyms.fetchNearbyCoord(
				Coordinate.restore({ latitude: -45, longitude: -45 }),
			)
			expect(nearby.map((gym) => gym.id)).toContain(gymId)

			// check in inside the unit of work
			const checkInId = recorder.newId()
			await unitOfWork.runTransaction(async (tx) => {
				await checkIns.withTransaction(tx).save(
					CheckIn.restore({
						id: checkInId,
						gymId,
						userId,
						createdAt,
						userLatitude: -45,
						userLongitude: -45,
					}),
				)
			})
			expect((await checkIns.checkOfById(checkInId))?.userId).toBe(userId)

			// create subscription inside the unit of work
			await plans.save(
				Plan.restore({
					id: planId,
					name: "Flow Plan",
					priceCents: 1990,
					billingPeriod: "monthly",
					tagline: "flow",
					features: [],
					isActive: true,
					stripePriceId: `price_${planId}`,
				}),
			)
			const subscriptionId = recorder.newId()
			await unitOfWork.runTransaction(async (tx) => {
				await subscriptions.withTransaction(tx).save(
					Subscription.restore({
						id: subscriptionId,
						userId,
						billingSubscriptionId: `sub_${subscriptionId}`,
						customerId: `cus_${userId}`,
						status: "active",
						planId,
						currentPeriodStart: createdAt,
						currentPeriodEnd: new Date("2026-06-10T15:00:00.000Z"),
						cancelAtPeriodEnd: false,
						createdAt,
						updatedAt: createdAt,
					}),
				)
			})
			expect((await subscriptions.ofUserId(userId))?.id).toBe(subscriptionId)
		})
	})
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/env/is-mongo-enabled.test.ts`
Expected: FAIL (`module.isMongoEnabled is not a function`: a função ainda não existe)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/initialize-mongo.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./initialize-mongo""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/ioc/module/database-provider-selection.integration-test.ts`
Expected: FAIL (os providers ainda devolvem os adapters Prisma ou in-memory e o `DatabaseHealthProviderResolver` não existe: `expected ... to be an instance of Mongo...` e `Failed to resolve import`)

- **Step 3: Write minimal implementation**

Em `apps/backend/src/shared/infra/env/index.ts`, acrescentar ao final:

```ts
export function isMongoEnabled(): boolean {
	return isProduction() && env.DATABASE_PROVIDER === "mongo"
}
```

`apps/backend/src/shared/infra/database/connection/mongo/initialize-mongo.ts`:

```ts
import type { MongoConnection } from "./mongo-connection"

export async function initializeMongo(connection: MongoConnection): Promise<void> {
	await connection.connect()
	await connection.assertTransactionsSupported()
	await connection.ensureIndexes()
}
```

`apps/backend/src/bootstrap/database-lifecycle.ts`:

```ts
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { initializeMongo } from "@/shared/infra/database/connection/mongo/initialize-mongo"
import { isMongoEnabled } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

function mongoConnection(): MongoConnection {
	return container.get<MongoConnection>(SHARED_TYPES.Mongo.Connection)
}

export async function startDatabase(): Promise<void> {
	if (!isMongoEnabled()) return
	await initializeMongo(mongoConnection())
}

export async function stopDatabase(): Promise<void> {
	if (!isMongoEnabled()) return
	await mongoConnection().disconnect()
}
```

Em `apps/backend/src/bootstrap/server-build.ts`, importar `startDatabase` de `./database-lifecycle` e chamá-lo antes de preparar o servidor (a API não sobe se o Mongo estiver fora ou sem replica set):

```ts
export async function serverBuild() {
	await startDatabase()
	const server = resolve<FastifyAdapter>(SHARED_TYPES.Server.Fastify)
	// ... restante inalterado
```

Em `apps/backend/src/main.ts`:

```ts
import "reflect-metadata"
import { serverBuild } from "@/bootstrap/server-build"
import { stopDatabase } from "./bootstrap/database-lifecycle"
import { setupCronJob } from "./bootstrap/setup-cron-job"
import type { HttpServer } from "./shared/infra/server/http-server"

async function setupGracefulShutdown(server: HttpServer): Promise<void> {
	await server.close()
	await stopDatabase()
	process.exit()
}
```

Em `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`, acrescentar os imports e o registro condicional (o `MongoConnection` só existe no container com o provider `mongo`):

```ts
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env, isMongoEnabled, isProduction } from "@/shared/infra/env"

function createMongoConnection(): MongoConnection {
	if (!env.DATABASE_URL_MONGO) {
		throw new Error("DATABASE_URL_MONGO is required when DATABASE_PROVIDER=mongo")
	}
	return new MongoConnection(env.DATABASE_URL_MONGO)
}
```

```ts
	bind(SHARED_TYPES.Prisma.UnitOfWork).to(PrismaUnitOfWork).inSingletonScope()
	if (isMongoEnabled()) {
		bind(SHARED_TYPES.Mongo.Connection).toConstantValue(createMongoConnection())
		bind(SHARED_TYPES.Mongo.UnitOfWork).to(MongoUnitOfWork).inSingletonScope()
	}
```

`apps/backend/src/shared/infra/health/database/database-health-provider-resolver.ts`:

```ts
import type { ResolutionContext } from "inversify"
import { isMongoEnabled } from "@/shared/infra/env"
import type { HealthProvider } from "@/shared/infra/health/health-check"
import { DatabaseHealthProvider } from "./database-health-provider"
import { MongoDatabaseHealthProvider } from "./mongo-database-health-provider"

export class DatabaseHealthProviderResolver {
	public static provide(context: ResolutionContext): HealthProvider {
		return isMongoEnabled()
			? context.get(MongoDatabaseHealthProvider, { autobind: true })
			: context.get(DatabaseHealthProvider, { autobind: true })
	}
}
```

Em `heath-check-module.ts`, trocar o bind do banco:

```ts
import { DatabaseHealthProviderResolver } from "@/shared/infra/health/database/database-health-provider-resolver"
// remover o import de DatabaseHealthProvider
	bind(HEALTH_CHECK_TYPES.Providers.Database).toDynamicValue(
		DatabaseHealthProviderResolver.provide,
	)
```

Providers (cada um preserva o comportamento atual e ganha o ramo Mongo primeiro).

`unit-of-work-provider.ts`:

```ts
import type { ResolutionContext } from "inversify"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import { MongoUnitOfWork } from "./mongo-unit-of-work"
import { PrismaUnitOfWork } from "./prisma-unit-of-work"
import { TestingUnitOfWork } from "./testing-unit-of-work"
import type { UnitOfWork } from "./unit-of-work"

export class UnitOfWorkProvider {
	public static provide(context: ResolutionContext): UnitOfWork {
		if (isMongoEnabled()) {
			return context.get(MongoUnitOfWork, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUnitOfWork, { autobind: true })
			: context.get(TestingUnitOfWork, { autobind: true })
	}
}
```

`user-repository-provider.ts`:

```ts
import type { ResolutionContext } from "inversify"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository.js"
import { MongoUserRepository } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { PrismaUserRepository } from "@/shared/infra/database/repository/prisma/prisma-user-repository"
import { SQLiteUserRepository } from "@/shared/infra/database/repository/sqlite/sqlite-user-repository"
import { env, isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

export class UserRepositoryProvider {
	public static provide(context: ResolutionContext): UserRepository {
		if (!isProduction()) {
			return context.get(InMemoryUserRepository, { autobind: true })
		}
		if (isMongoEnabled()) {
			return context.get(MongoUserRepository, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaUserRepository, { autobind: true })
		}
		return context.get(SQLiteUserRepository, { autobind: true })
	}
}
```

Os providers abaixo seguem o mesmo molde de duas linhas: `if (isMongoEnabled()) return context.get(Mongo..., { autobind: true })` antes da expressão atual (`isProduction() ? Prisma : InMemory`), com o import de `isMongoEnabled` de `@/shared/infra/env` e o do adapter Mongo.

`user-dao-provider.ts` (`UserDAOProvider`):

```ts
	public static provide(context: ResolutionContext): UserDAO {
		if (isMongoEnabled()) return context.get(MongoUserDao, { autobind: true })
		return isProduction()
			? context.get(PrismaUserDAO, { autobind: true })
			: context.get(UserDAOMemory, { autobind: true })
	}
```

`user-activity-dao-provider.ts` (`UserActivityDaoProvider`), adapter `MongoUserActivityDao` de `@/shared/infra/database/dao/mongo/mongo-user-activity-dao`:

```ts
	public static provide(context: ResolutionContext): UserActivityDao {
		if (isMongoEnabled()) {
			return context.get(MongoUserActivityDao, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUserActivityDao, { autobind: true })
			: context.get(InMemoryUserActivityDao, { autobind: true })
	}
```

`user-activity-repository-provider.ts` (`UserActivityRepositoryProvider`), adapter `MongoUserActivityRepository` de `@/shared/infra/database/repository/mongo/mongo-user-activity-repository`:

```ts
	public static provide(context: ResolutionContext): UserActivityRepository {
		if (isMongoEnabled()) {
			return context.get(MongoUserActivityRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUserActivityRepository, { autobind: true })
			: context.get(InMemoryUserActivityRepository, { autobind: true })
	}
```

`gym-repository-provider.ts` (`MongoGymRepository`), `check-in-repository-provider.ts` (`MongoCheckInRepository`), `subscription-repository-provider.ts` (`MongoSubscriptionRepository`), `plan-repository-provider.ts` (`MongoPlanRepository`), `stripe-webhook-event-repository-provider.ts` (`MongoStripeWebhookEventRepository`), `analytics-user-repository-provider.ts` (`MongoAnalyticsUserRepository`), `analytics-check-in-repository-provider.ts` (`MongoAnalyticsCheckInRepository`), todos com o formato do exemplo do gym:

```ts
	public static provide(context: ResolutionContext): GymRepository {
		if (isMongoEnabled()) {
			return context.get(MongoGymRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaGymRepository, { autobind: true })
			: context.get(InMemoryGymRepository, { autobind: true })
	}
```

`notification-repository-provider.ts`:

```ts
import { MongoNotificationRepository } from "@/notification/infra/repository/mongo/mongo-notification.repository.js"
import { env, isMongoEnabled, isProduction } from "@/shared/infra/env/index.js"

export class NotificationRepositoryProvider {
	public static provide(context: ResolutionContext): NotificationRepository {
		if (!isProduction()) {
			return context.get(InMemoryNotificationRepository, { autobind: true })
		}
		if (isMongoEnabled()) {
			return context.get(MongoNotificationRepository, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaNotificationRepository, { autobind: true })
		}
		return context.get(InMemoryNotificationRepository, { autobind: true })
	}
}
```

`active-recipients-provider-resolver.ts`, mesmo molde com `MongoActiveRecipientsProvider` de `@/notification/infra/provider/mongo/mongo-active-recipients.provider.js` entre o teste de produção e o de `prisma`.

- **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/env/is-mongo-enabled.test.ts`
Expected: PASS (3 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/initialize-mongo.integration-test.ts`
Expected: PASS (2 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/ioc/module/database-provider-selection.integration-test.ts`
Expected: PASS (21 testes: 15 do Mongo, 4 do Prisma, 1 fora de produção e 1 de fluxo; exige Postgres e o MongoDB do compose)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src
git commit -m "feat(backend): seleção de adapters Mongo ou Prisma por DATABASE_PROVIDER"
```

## Critérios de Sucesso

- AC-01 [int]: WHEN `DATABASE_PROVIDER=mongo` THEN a API sobe e as rotas de usuário, academia, check-in e assinatura funcionam
- Nesta task o AC-01 é provado no nível das portas: os providers resolvem os adapters Mongo e os fluxos de criar usuário, criar academia, fazer check-in e criar assinatura, com `UnitOfWork`, rodam contra o MongoDB real; a subida da API é garantida por `startDatabase` em `serverBuild`.
- FR-001: com `DATABASE_PROVIDER=mongo` em produção, todos os providers (repositórios, DAOs, analytics, destinatários, `UnitOfWork` e health) devolvem o adapter Mongo.
- FR-002: um único banco fica ativo por processo: cada provider devolve exatamente um adapter, e o `MongoConnection` só é registrado no container com o provider `mongo`.
- FR-003: com `prisma` (padrão) os providers continuam devolvendo os adapters Prisma e, fora de produção, os in-memory.
- A API não sobe quando o Mongo está fora ou sem replica set (`initializeMongo` rejeita antes de preparar o servidor) e a conexão é fechada no encerramento.
