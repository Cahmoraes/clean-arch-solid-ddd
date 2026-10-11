import type { Document } from "mongodb"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUserActivityDao } from "@/shared/infra/database/dao/mongo/mongo-user-activity-dao"
import { MongoUserActivityRepository } from "./mongo-user-activity-repository"

describe("MongoUserActivityRepository", () => {
	let connection: MongoConnection
	let repository: MongoUserActivityRepository
	const recorder = new IdRecorder()

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoUserActivityRepository(connection)
	})

	afterEach(async () => {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.USER_ACTIVITY_EVENTS, fields: ["user_id"] },
		])
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("FR-004: record stores the event with the Prisma column names", async () => {
		const userId = recorder.newId()
		const occurredAt = new Date("2026-05-10T10:00:00.000Z")

		await repository.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			metadata: { ip: "127.0.0.1" },
			occurredAt,
		})
		await repository.record({
			userId,
			type: "PASSWORD_CHANGED",
			description: "Senha alterada",
			occurredAt: new Date("2026-05-11T10:00:00.000Z"),
		})

		const documents = await connection
			.collection<Document>(COLLECTIONS.USER_ACTIVITY_EVENTS)
			.find({ user_id: userId })
			.sort({ occurred_at: 1 })
			.toArray()
		expect(documents).toHaveLength(2)
		expect(documents[0]).toMatchObject({
			user_id: userId,
			type: "LOGIN",
			description: "Login realizado",
			metadata: { ip: "127.0.0.1" },
			occurred_at: occurredAt,
		})
		expect(documents[1].metadata).toBeNull()
	})

	it("FR-004: a recorded event shows up in the activity page of the user", async () => {
		const userId = recorder.newId()
		await repository.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			occurredAt: new Date("2026-05-10T10:00:00.000Z"),
		})

		const page = await new MongoUserActivityDao(connection).findActivityPage(
			userId,
			1,
			10,
		)

		expect(page.items.map((item) => item.description)).toEqual([
			"Login realizado",
		])
		expect(page.pagination.total).toBe(1)
	})
})
