import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type {
	CheckIn,
	Gym,
	Notification,
	Plan,
	StripeWebhookEvent,
	Subscription,
	User,
	UserActivityEvent,
	UserNotification,
} from "@/shared/infra/database/generated/prisma/client"
import { Prisma } from "@/shared/infra/database/generated/prisma/client"
import { EtlBatchError, runEtl } from "./etl-runner"
import type { EtlCollection, EtlRows, EtlSource } from "./etl-types"

const NOW = new Date("2026-05-10T12:00:00.000Z")

function userRow(id: string): User {
	return {
		id,
		name: "ETL User",
		email: `${id}@etl.test`,
		password_hash: null,
		google_id: null,
		created_at: NOW,
		role: "MEMBER",
		updated_at: NOW,
		status: "activated",
		billing_customer_id: null,
		is_super_admin: false,
		deleted_at: null,
	}
}

function planRow(id: string): Plan {
	return {
		id,
		name: "ETL Plan",
		price_cents: 1000,
		billing_period: "monthly",
		tagline: "tag",
		features: [],
		is_active: true,
		stripe_price_id: null,
		created_at: NOW,
		updated_at: NOW,
	}
}

function gymRow(id: string): Gym {
	return {
		id,
		cnpj: id,
		title: "ETL Gym",
		description: null,
		phone: null,
		address: null,
		image_key: null,
		latitude: new Prisma.Decimal("-23.5505"),
		longitude: new Prisma.Decimal("-46.6333"),
		status: "activated",
		operating_hours: null,
		created_at: NOW,
		updated_at: NOW,
	}
}

function subscriptionRow(
	id: string,
	userId: string,
	planId: string | null,
): Subscription {
	return {
		id,
		user_id: userId,
		billing_subscription_id: `sub_${id}`,
		customer_id: `cus_${userId}`,
		status: "canceled",
		canceled_at: NOW,
		created_at: NOW,
		updated_at: NOW,
		plan_id: planId,
		current_period_start: NOW,
		current_period_end: NOW,
		cancel_at_period_end: false,
	}
}

function checkInRow(
	id: string,
	userId: string,
	gymId: string,
	createdAt: Date,
): CheckIn {
	return {
		id,
		created_at: createdAt,
		validated_at: null,
		rejected_at: null,
		latitude: new Prisma.Decimal("-23.5505"),
		longitude: new Prisma.Decimal("-46.6333"),
		user_id: userId,
		gym_id: gymId,
		updated_at: createdAt,
	}
}

function notificationRow(id: string, userId: string): Notification {
	return {
		id,
		userId,
		type: "NOTICE",
		title: "t",
		message: "m",
		gymName: null,
		reason: null,
		createdAt: NOW,
		updatedAt: NOW,
	}
}

function userNotificationRow(
	id: string,
	notificationId: string,
	userId: string,
): UserNotification {
	return {
		id,
		notificationId,
		userId,
		readAt: null,
		deletedAt: null,
		createdAt: NOW,
		updatedAt: NOW,
	}
}

function activityRow(id: string, userId: string): UserActivityEvent {
	return {
		id,
		userId,
		type: "LOGIN",
		description: "Login",
		metadata: null,
		occurredAt: NOW,
		createdAt: NOW,
	}
}

function webhookRow(id: string): StripeWebhookEvent {
	return {
		id,
		event_id: `evt_${id}`,
		event_type: "invoice.paid",
		processed_at: NOW,
	}
}

type Rows = { [K in EtlCollection]?: EtlRows[K][] }

class ArrayEtlSource implements EtlSource {
	constructor(
		private readonly rows: Rows,
		private readonly failAfterReads?: {
			collection: EtlCollection
			reads: number
		},
	) {}

	private reads = new Map<EtlCollection, number>()

	public async readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]> {
		const reads = (this.reads.get(collection) ?? 0) + 1
		this.reads.set(collection, reads)
		if (
			this.failAfterReads?.collection === collection &&
			reads > this.failAfterReads.reads
		) {
			throw new Error("source unavailable")
		}
		const rows: EtlRows[K][] = this.rows[collection] ?? []
		const ordered = [...rows].sort((a, b) =>
			a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
		)
		return ordered
			.filter((row) => afterId === undefined || row.id > afterId)
			.slice(0, size)
	}

	public async count(collection: EtlCollection): Promise<number> {
		return (this.rows[collection] ?? []).length
	}
}

describe("runEtl with an in-memory source", () => {
	const opened: { connection: MongoConnection; dbName: string }[] = []

	async function freshConnection(): Promise<MongoConnection> {
		const dbName = `etl_${randomUUID().replaceAll("-", "")}`
		const connection = await createTestMongoConnection(dbName)
		opened.push({ connection, dbName })
		return connection
	}

	afterAll(async () => {
		for (const { connection, dbName } of opened) {
			await connection.client().db(dbName).dropDatabase()
			await connection.disconnect()
		}
	})

	it("Review Focus: a record whose parent is missing is reported as an orphan and left out of the copy", async () => {
		const connection = await freshConnection()
		const [
			userId,
			planId,
			gymId,
			missingUser,
			missingPlan,
			missingGym,
			missingNotification,
		] = Array.from({ length: 7 }, () => randomUUID())
		const day = (n: number) =>
			new Date(`2026-05-${String(n).padStart(2, "0")}T12:00:00.000Z`)
		const ok = {
			subscription: randomUUID(),
			checkIn: randomUUID(),
			notification: randomUUID(),
			userNotification: randomUUID(),
			activity: randomUUID(),
			webhook: randomUUID(),
		}
		const orphan = {
			subscriptionUser: randomUUID(),
			subscriptionPlan: randomUUID(),
			checkInUser: randomUUID(),
			checkInGym: randomUUID(),
			notification: randomUUID(),
			userNotificationOfOrphanNotification: randomUUID(),
			userNotificationUser: randomUUID(),
			activity: randomUUID(),
		}
		const source = new ArrayEtlSource({
			plans: [planRow(planId)],
			users: [userRow(userId)],
			gyms: [gymRow(gymId)],
			subscriptions: [
				subscriptionRow(ok.subscription, userId, planId),
				subscriptionRow(orphan.subscriptionUser, missingUser, null),
				subscriptionRow(orphan.subscriptionPlan, userId, missingPlan),
			],
			check_ins: [
				checkInRow(ok.checkIn, userId, gymId, day(10)),
				checkInRow(orphan.checkInUser, missingUser, gymId, day(11)),
				checkInRow(orphan.checkInGym, userId, missingGym, day(12)),
			],
			notifications: [
				notificationRow(ok.notification, userId),
				notificationRow(orphan.notification, missingUser),
			],
			user_notifications: [
				userNotificationRow(ok.userNotification, ok.notification, userId),
				userNotificationRow(
					orphan.userNotificationOfOrphanNotification,
					orphan.notification,
					userId,
				),
				userNotificationRow(
					orphan.userNotificationUser,
					missingNotification,
					userId,
				),
			],
			user_activity_events: [
				activityRow(ok.activity, userId),
				activityRow(orphan.activity, missingUser),
			],
			stripe_webhook_events: [webhookRow(ok.webhook)],
		})

		const report = await runEtl({ source, connection })

		const count = (name: string) =>
			connection.collection(name).countDocuments({})
		expect(await count(COLLECTIONS.PLANS)).toBe(1)
		expect(await count(COLLECTIONS.USERS)).toBe(1)
		expect(await count(COLLECTIONS.GYMS)).toBe(1)
		expect(await count(COLLECTIONS.SUBSCRIPTIONS)).toBe(1)
		expect(await count(COLLECTIONS.CHECK_INS)).toBe(1)
		expect(await count(COLLECTIONS.NOTIFICATIONS)).toBe(1)
		expect(await count(COLLECTIONS.USER_NOTIFICATIONS)).toBe(1)
		expect(await count(COLLECTIONS.USER_ACTIVITY_EVENTS)).toBe(1)
		expect(await count(COLLECTIONS.STRIPE_WEBHOOK_EVENTS)).toBe(1)
		expect(
			report.orphans.map((item) => `${item.collection}:${item.id}`).sort(),
		).toEqual(
			[
				`subscriptions:${orphan.subscriptionUser}`,
				`subscriptions:${orphan.subscriptionPlan}`,
				`check_ins:${orphan.checkInUser}`,
				`check_ins:${orphan.checkInGym}`,
				`notifications:${orphan.notification}`,
				`user_notifications:${orphan.userNotificationOfOrphanNotification}`,
				`user_notifications:${orphan.userNotificationUser}`,
				`user_activity_events:${orphan.activity}`,
			].sort(),
		)
		expect(
			report.orphans.every((item) => item.reason.includes("missing parent")),
		).toBe(true)
		expect(report.collections.subscriptions).toMatchObject({
			sourceCount: 3,
			copied: 1,
			excluded: 2,
			mongoCount: 1,
		})
		expect(report.ok).toBe(true)
	})

	it("FR-015: a second check-in of the same user on the same UTC day is reported and excluded, keeping the first by id", async () => {
		const connection = await freshConnection()
		const userId = randomUUID()
		const gymId = randomUUID()
		const [firstId, secondId] = [randomUUID(), randomUUID()].sort()
		const source = new ArrayEtlSource({
			users: [userRow(userId)],
			gyms: [gymRow(gymId)],
			check_ins: [
				checkInRow(
					firstId,
					userId,
					gymId,
					new Date("2026-05-10T01:00:00.000Z"),
				),
				checkInRow(
					secondId,
					userId,
					gymId,
					new Date("2026-05-10T23:00:00.000Z"),
				),
			],
		})

		const report = await runEtl({ source, connection })

		const stored = await connection
			.collection(COLLECTIONS.CHECK_INS)
			.find({})
			.toArray()
		expect(stored.map((document) => document._id)).toEqual([firstId])
		expect(report.duplicateCheckIns).toEqual([
			expect.objectContaining({ collection: "check_ins", id: secondId }),
		])
		expect(report.collections.check_ins).toMatchObject({
			sourceCount: 2,
			copied: 1,
			excluded: 1,
			mongoCount: 1,
		})
		expect(report.ok).toBe(true)
	})

	it("a second user_notification of the same notification and user is reported and excluded, keeping the first by id", async () => {
		const connection = await freshConnection()
		const userId = randomUUID()
		const notificationId = randomUUID()
		const [firstId, secondId] = [randomUUID(), randomUUID()].sort()
		const source = new ArrayEtlSource({
			users: [userRow(userId)],
			notifications: [notificationRow(notificationId, userId)],
			user_notifications: [
				userNotificationRow(firstId, notificationId, userId),
				userNotificationRow(secondId, notificationId, userId),
			],
		})

		const report = await runEtl({ source, connection })

		const stored = await connection
			.collection(COLLECTIONS.USER_NOTIFICATIONS)
			.find({})
			.toArray()
		expect(stored.map((document) => document._id)).toEqual([firstId])
		expect(report.duplicateUserNotifications).toEqual([
			expect.objectContaining({
				collection: "user_notifications",
				id: secondId,
			}),
		])
		expect(report.collections.user_notifications).toMatchObject({
			sourceCount: 2,
			copied: 1,
			excluded: 1,
			mongoCount: 1,
		})
		expect(report.ok).toBe(true)
	})

	it("copies a collection larger than the batch size in id order", async () => {
		const connection = await freshConnection()
		const plans = Array.from({ length: 5 }, () => planRow(randomUUID()))
		const source = new ArrayEtlSource({ plans })

		const report = await runEtl({ source, connection, batchSize: 2 })

		expect(report.collections.plans).toMatchObject({
			sourceCount: 5,
			copied: 5,
			mongoCount: 5,
		})
		expect(
			await connection.collection(COLLECTIONS.PLANS).countDocuments({}),
		).toBe(5)
	})

	it("FR-014: a failure in the middle names the collection and running again completes the copy", async () => {
		const connection = await freshConnection()
		const users = Array.from({ length: 5 }, () => userRow(randomUUID()))
		const failing = new ArrayEtlSource(
			{ users },
			{ collection: "users", reads: 1 },
		)

		const error = await runEtl({
			source: failing,
			connection,
			batchSize: 2,
		}).then(
			() => undefined,
			(caught: unknown) => caught,
		)

		expect(error).toBeInstanceOf(EtlBatchError)
		if (!(error instanceof EtlBatchError)) return
		expect(error.collection).toBe("users")
		expect(
			await connection.collection(COLLECTIONS.USERS).countDocuments({}),
		).toBe(2)

		const report = await runEtl({
			source: new ArrayEtlSource({ users }),
			connection,
			batchSize: 2,
		})

		expect(report.collections.users).toMatchObject({
			sourceCount: 5,
			copied: 5,
			mongoCount: 5,
		})
		expect(
			await connection.collection(COLLECTIONS.USERS).countDocuments({}),
		).toBe(5)
	})
})
