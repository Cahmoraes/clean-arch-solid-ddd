import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { COLLECTIONS, type MongoConnection } from "./mongo-connection"
import { duplicateKeyFields, isDuplicateKeyError } from "./mongo-duplicate-key"

interface UserDocument {
	_id: string
	email: string
}

describe("mongo duplicate key helpers", () => {
	let connection: MongoConnection
	const createdIds: string[] = []

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterEach(async () => {
		await connection
			.collection<UserDocument>(COLLECTIONS.USERS)
			.deleteMany({ _id: { $in: createdIds.splice(0) } })
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("recognises a real unique index violation and reports the violated field", async () => {
		const users = connection.collection<UserDocument>(COLLECTIONS.USERS)
		const email = `${randomUUID()}@duplicate-key.test`
		const firstId = randomUUID()
		const secondId = randomUUID()
		createdIds.push(firstId, secondId)
		await users.insertOne({ _id: firstId, email })

		const error = await users
			.insertOne({ _id: secondId, email })
			.catch((caught: unknown) => caught)

		expect(isDuplicateKeyError(error)).toBe(true)
		if (!isDuplicateKeyError(error)) return
		expect(duplicateKeyFields(error)).toEqual(["email"])
	})

	it("does not classify unrelated errors as duplicate key errors", () => {
		expect(isDuplicateKeyError(new Error("boom"))).toBe(false)
		expect(isDuplicateKeyError(undefined)).toBe(false)
	})
})
