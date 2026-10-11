import { Container, type ResolutionContext } from "inversify"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"
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
					const { UserRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/user/user-repository-provider"
					)
					const { MongoUserRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-user-repository"
					)
					expectAdapter(c, UserRepositoryProvider.provide, MongoUserRepository)
				},
			},
			{
				name: "user DAO",
				check: async (c) => {
					const { UserDAOProvider } = await import(
						"@/shared/infra/ioc/module/user/user-dao-provider"
					)
					const { MongoUserDao } = await import(
						"@/shared/infra/database/dao/mongo/mongo-user-dao"
					)
					expectAdapter(c, UserDAOProvider.provide, MongoUserDao)
				},
			},
			{
				name: "user activity DAO",
				check: async (c) => {
					const { UserActivityDaoProvider } = await import(
						"@/shared/infra/ioc/module/user/user-activity-dao-provider"
					)
					const { MongoUserActivityDao } = await import(
						"@/shared/infra/database/dao/mongo/mongo-user-activity-dao"
					)
					expectAdapter(
						c,
						UserActivityDaoProvider.provide,
						MongoUserActivityDao,
					)
				},
			},
			{
				name: "user activity repository",
				check: async (c) => {
					const { UserActivityRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/user/user-activity-repository-provider"
					)
					const { MongoUserActivityRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
					)
					expectAdapter(
						c,
						UserActivityRepositoryProvider.provide,
						MongoUserActivityRepository,
					)
				},
			},
			{
				name: "gym repository",
				check: async (c) => {
					const { GymRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/gym/gym-repository-provider"
					)
					const { MongoGymRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-gym-repository"
					)
					expectAdapter(c, GymRepositoryProvider.provide, MongoGymRepository)
				},
			},
			{
				name: "check-in repository",
				check: async (c) => {
					const { CheckInRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/check-in/check-in-repository-provider"
					)
					const { MongoCheckInRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-check-in-repository"
					)
					expectAdapter(
						c,
						CheckInRepositoryProvider.provide,
						MongoCheckInRepository,
					)
				},
			},
			{
				name: "subscription repository",
				check: async (c) => {
					const { SubscriptionRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/subscription/subscription-repository-provider"
					)
					const { MongoSubscriptionRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-subscription-repository"
					)
					expectAdapter(
						c,
						SubscriptionRepositoryProvider.provide,
						MongoSubscriptionRepository,
					)
				},
			},
			{
				name: "plan repository",
				check: async (c) => {
					const { PlanRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/subscription/plan-repository-provider"
					)
					const { MongoPlanRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-plan-repository"
					)
					expectAdapter(c, PlanRepositoryProvider.provide, MongoPlanRepository)
				},
			},
			{
				name: "Stripe webhook event repository",
				check: async (c) => {
					const { StripeWebhookEventRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/subscription/stripe-webhook-event-repository-provider"
					)
					const { MongoStripeWebhookEventRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository"
					)
					expectAdapter(
						c,
						StripeWebhookEventRepositoryProvider.provide,
						MongoStripeWebhookEventRepository,
					)
				},
			},
			{
				name: "notification repository",
				check: async (c) => {
					const { NotificationRepositoryProvider } = await import(
						"@/notification/infra/repository/notification-repository-provider"
					)
					const { MongoNotificationRepository } = await import(
						"@/notification/infra/repository/mongo/mongo-notification.repository"
					)
					expectAdapter(
						c,
						NotificationRepositoryProvider.provide,
						MongoNotificationRepository,
					)
				},
			},
			{
				name: "active recipients provider",
				check: async (c) => {
					const { ActiveRecipientsProviderResolver } = await import(
						"@/notification/infra/provider/active-recipients-provider-resolver"
					)
					const { MongoActiveRecipientsProvider } = await import(
						"@/notification/infra/provider/mongo/mongo-active-recipients.provider"
					)
					expectAdapter(
						c,
						ActiveRecipientsProviderResolver.provide,
						MongoActiveRecipientsProvider,
					)
				},
			},
			{
				name: "analytics user repository",
				check: async (c) => {
					const { AnalyticsUserRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/analytics/analytics-user-repository-provider"
					)
					const { MongoAnalyticsUserRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-analytics-user-repository"
					)
					expectAdapter(
						c,
						AnalyticsUserRepositoryProvider.provide,
						MongoAnalyticsUserRepository,
					)
				},
			},
			{
				name: "analytics check-in repository",
				check: async (c) => {
					const { AnalyticsCheckInRepositoryProvider } = await import(
						"@/shared/infra/ioc/module/analytics/analytics-check-in-repository-provider"
					)
					const { MongoAnalyticsCheckInRepository } = await import(
						"@/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository"
					)
					expectAdapter(
						c,
						AnalyticsCheckInRepositoryProvider.provide,
						MongoAnalyticsCheckInRepository,
					)
				},
			},
			{
				name: "unit of work",
				check: async (c) => {
					const { UnitOfWorkProvider } = await import(
						"@/shared/infra/database/repository/unit-of-work/unit-of-work-provider"
					)
					const { MongoUnitOfWork } = await import(
						"@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
					)
					expectAdapter(c, UnitOfWorkProvider.provide, MongoUnitOfWork)
				},
			},
			{
				name: "database health provider",
				check: async (c) => {
					const { DatabaseHealthProviderResolver } = await import(
						"@/shared/infra/health/database/database-health-provider-resolver"
					)
					const { MongoDatabaseHealthProvider } = await import(
						"@/shared/infra/health/database/mongo-database-health-provider"
					)
					expectAdapter(
						c,
						DatabaseHealthProviderResolver.provide,
						MongoDatabaseHealthProvider,
					)
				},
			},
		]

		it.each(
			cases,
		)("FR-001, FR-002: the $name resolves to the Mongo adapter", async ({
			check,
		}) => {
			await check(container)
		})
	})

	describe("DATABASE_PROVIDER=prisma (default) in production", () => {
		beforeEach(async () => {
			vi.stubEnv("NODE_ENV", "production")
			vi.stubEnv("DATABASE_PROVIDER", "prisma")
			const { prismaClient } = await import(
				"@/shared/infra/database/connection/prisma-client.js"
			)
			container.bind(SHARED_TYPES.Prisma.Client).toConstantValue(prismaClient)
		})

		afterAll(async () => {
			const { prismaClient } = await import(
				"@/shared/infra/database/connection/prisma-client.js"
			)
			await prismaClient.$disconnect()
		})

		it("FR-003: the user repository stays Prisma", async () => {
			const { UserRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/user/user-repository-provider"
			)
			const { PrismaUserRepository } = await import(
				"@/shared/infra/database/repository/prisma/prisma-user-repository"
			)
			expectAdapter(
				container,
				UserRepositoryProvider.provide,
				PrismaUserRepository,
			)
		})

		it("FR-003: the gym repository stays Prisma", async () => {
			const { GymRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/gym/gym-repository-provider"
			)
			const { PrismaGymRepository } = await import(
				"@/shared/infra/database/repository/prisma/prisma-gym-repository"
			)
			expectAdapter(
				container,
				GymRepositoryProvider.provide,
				PrismaGymRepository,
			)
		})

		it("FR-003: the unit of work stays Prisma", async () => {
			const { UnitOfWorkProvider } = await import(
				"@/shared/infra/database/repository/unit-of-work/unit-of-work-provider"
			)
			const { PrismaUnitOfWork } = await import(
				"@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
			)
			expectAdapter(container, UnitOfWorkProvider.provide, PrismaUnitOfWork)
		})

		it("FR-003: the database health provider stays Prisma", async () => {
			const { DatabaseHealthProviderResolver } = await import(
				"@/shared/infra/health/database/database-health-provider-resolver"
			)
			const { DatabaseHealthProvider } = await import(
				"@/shared/infra/health/database/database-health-provider"
			)
			expectAdapter(
				container,
				DatabaseHealthProviderResolver.provide,
				DatabaseHealthProvider,
			)
		})
	})

	describe("outside production", () => {
		it("keeps the in-memory adapters even when DATABASE_PROVIDER=mongo", async () => {
			vi.stubEnv("NODE_ENV", "test")
			vi.stubEnv("DATABASE_PROVIDER", "mongo")
			const { GymRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/gym/gym-repository-provider"
			)
			const { InMemoryGymRepository } = await import(
				"@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
			)

			expectAdapter(
				container,
				GymRepositoryProvider.provide,
				InMemoryGymRepository,
			)
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
			const { UserRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/user/user-repository-provider"
			)
			const { GymRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/gym/gym-repository-provider"
			)
			const { CheckInRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/check-in/check-in-repository-provider"
			)
			const { PlanRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/subscription/plan-repository-provider"
			)
			const { SubscriptionRepositoryProvider } = await import(
				"@/shared/infra/ioc/module/subscription/subscription-repository-provider"
			)
			const { UnitOfWorkProvider } = await import(
				"@/shared/infra/database/repository/unit-of-work/unit-of-work-provider"
			)
			const users = resolveWith(container, UserRepositoryProvider.provide)
			const gyms = resolveWith(container, GymRepositoryProvider.provide)
			const checkIns = resolveWith(container, CheckInRepositoryProvider.provide)
			const plans = resolveWith(container, PlanRepositoryProvider.provide)
			const subscriptions = resolveWith(
				container,
				SubscriptionRepositoryProvider.provide,
			)
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
					cnpj: Array.from({ length: 14 }, () =>
						Math.floor(Math.random() * 10),
					).join(""),
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
