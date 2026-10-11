import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	type ActivitySeed,
	describeUserActivityDaoContract,
} from "test/repository-contract/user-activity-dao-contract"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import { MongoUserActivityDao } from "./mongo-user-activity-dao"

const CLEANUP_TARGETS = [
	{ collection: COLLECTIONS.USER_ACTIVITY_EVENTS, fields: ["_id", "user_id"] },
	{ collection: COLLECTIONS.CHECK_INS, fields: ["_id", "user_id", "gym_id"] },
	{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
]

async function seedActivity(
	connection: MongoConnection,
	data: ActivitySeed,
): Promise<void> {
	await connection
		.collection<{ _id: string; title: string }>(COLLECTIONS.GYMS)
		.insertOne({ _id: data.gymId, title: data.gymTitle })
	await insertEvents(connection, data)
	await insertCheckIns(connection, data)
}

async function insertEvents(
	connection: MongoConnection,
	data: ActivitySeed,
): Promise<void> {
	if (data.events.length === 0) return
	await connection
		.collection<UserActivityEventDocument>(COLLECTIONS.USER_ACTIVITY_EVENTS)
		.insertMany(
			data.events.map((event) => ({
				_id: event.id,
				user_id: data.userId,
				type: event.type,
				description: event.description,
				metadata: null,
				occurred_at: event.occurredAt,
				created_at: event.occurredAt,
			})),
		)
}

async function insertCheckIns(
	connection: MongoConnection,
	data: ActivitySeed,
): Promise<void> {
	if (data.checkIns.length === 0) return
	await connection
		.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
		.insertMany(
			data.checkIns.map((checkIn) => ({
				_id: checkIn.id,
				created_at: checkIn.occurredAt,
				validated_at: null,
				rejected_at: null,
				latitude: -23.5505,
				longitude: -46.6333,
				user_id: data.userId,
				gym_id: data.gymId,
				updated_at: checkIn.occurredAt,
				dayKey: checkIn.occurredAt.toISOString().slice(0, 10),
			})),
		)
}

describe("MongoUserActivityDao", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserActivityDaoContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			newId: () => recorder.newId(),
			seed: async (data) => {
				await seedActivity(connection, data)
				return new MongoUserActivityDao(connection)
			},
			cleanup: () =>
				deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS),
		}
	})

	describe("mongo specifics", () => {
		const recorder = new IdRecorder()

		afterEach(() =>
			deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS),
		)

		it("fails explicitly when a check-in references a gym that does not exist", async () => {
			const userId = recorder.newId()
			const checkInId = recorder.newId()
			const missingGymId = recorder.newId()
			await connection
				.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
				.insertOne({
					_id: checkInId,
					created_at: new Date("2026-05-11T11:00:00.000Z"),
					validated_at: null,
					rejected_at: null,
					latitude: -23.5505,
					longitude: -46.6333,
					user_id: userId,
					gym_id: missingGymId,
					updated_at: new Date("2026-05-11T11:00:00.000Z"),
					dayKey: "2026-05-11",
				})

			await expect(
				new MongoUserActivityDao(connection).findActivityPage(userId, 1, 10),
			).rejects.toThrow(missingGymId)
		})
	})
})
