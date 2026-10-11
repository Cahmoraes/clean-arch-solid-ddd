import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { MongoTransactionsUnsupportedError } from "@/shared/infra/errors/mongo-transactions-unsupported-error"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"
import { COLLECTIONS, MongoConnection } from "./mongo-connection"

const STANDALONE_URL =
	process.env.DATABASE_URL_MONGO_STANDALONE ??
	"mongodb://127.0.0.1:27018/test?directConnection=true"

async function indexNames(
	connection: MongoConnection,
	collectionName: string,
): Promise<string[]> {
	const indexes = await connection.collection(collectionName).indexes()
	return indexes.flatMap((index) => (index.name ? [index.name] : []))
}

describe("MongoConnection", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("AC-05: accepts the replica set started by the compose file", async () => {
		await expect(
			connection.assertTransactionsSupported(),
		).resolves.toBeUndefined()
	})

	it("creates the unique and query indexes of every collection", async () => {
		await connection.ensureIndexes()
		expect(await indexNames(connection, COLLECTIONS.USERS)).toEqual(
			expect.arrayContaining([
				"users_email_unique",
				"users_google_id_unique",
				"users_billing_customer_id_unique",
			]),
		)
		expect(await indexNames(connection, COLLECTIONS.GYMS)).toEqual(
			expect.arrayContaining(["gyms_cnpj_unique", "gyms_location_2dsphere"]),
		)
		expect(await indexNames(connection, COLLECTIONS.CHECK_INS)).toEqual(
			expect.arrayContaining([
				"check_ins_user_day_unique",
				"check_ins_user_created_at",
			]),
		)
		expect(await indexNames(connection, COLLECTIONS.SUBSCRIPTIONS)).toEqual(
			expect.arrayContaining([
				"subscriptions_billing_subscription_id_unique",
				"subscriptions_user_id_active_unique",
			]),
		)
		expect(
			await indexNames(connection, COLLECTIONS.STRIPE_WEBHOOK_EVENTS),
		).toContain("stripe_webhook_events_event_id_unique")
		expect(await indexNames(connection, COLLECTIONS.NOTIFICATIONS)).toContain(
			"notifications_user_id",
		)
		expect(
			await indexNames(connection, COLLECTIONS.USER_NOTIFICATIONS),
		).toContain("user_notifications_user_id")
		expect(
			await indexNames(connection, COLLECTIONS.USER_ACTIVITY_EVENTS),
		).toContain("user_activity_events_user_occurred_at")
	})

	it("ensureIndexes is idempotent", async () => {
		await connection.ensureIndexes()
		await expect(connection.ensureIndexes()).resolves.toBeUndefined()
	})
})

describe("MongoConnection startup failures", () => {
	it("AC-05: connect rejects with MongoUnavailableError citing --replSet when MongoDB is unreachable", async () => {
		const unreachable = new MongoConnection(
			"mongodb://127.0.0.1:1/test?directConnection=true",
		)
		const error = await unreachable.connect().catch((caught: unknown) => caught)
		await unreachable.disconnect()
		expect(error).toBeInstanceOf(MongoUnavailableError)
		if (!(error instanceof Error)) throw error
		expect(error.message).toContain("--replSet")
	}, 20_000)

	it("AC-05: assertTransactionsSupported rejects citing --replSet on a standalone MongoDB, before any transaction runs", async () => {
		const standalone = new MongoConnection(STANDALONE_URL)
		await standalone.connect()
		try {
			const error = await standalone
				.assertTransactionsSupported()
				.catch((caught: unknown) => caught)
			expect(error).toBeInstanceOf(MongoTransactionsUnsupportedError)
			if (!(error instanceof Error)) throw error
			expect(error.message).toContain("--replSet")
		} finally {
			await standalone.disconnect()
		}
	}, 20_000)
})
