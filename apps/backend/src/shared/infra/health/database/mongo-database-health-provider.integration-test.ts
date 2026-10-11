import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoDatabaseHealthProvider } from "./mongo-database-health-provider"

describe("MongoDatabaseHealthProvider", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("FR-018: reports up with the mongo metadata when the database answers", async () => {
		const sut = new MongoDatabaseHealthProvider(connection)
		const health = await sut.check()
		expect(health.name).toBe("database")
		expect(health.status).toBe("up")
		expect(health.metadata).toEqual({ provider: "mongo", database: "mongodb" })
	})

	it("FR-018: reports down with the error message when the database is unreachable", async () => {
		const unreachable = new MongoConnection(
			"mongodb://127.0.0.1:1/test?directConnection=true",
		)
		const sut = new MongoDatabaseHealthProvider(unreachable)
		const health = await sut.check()
		await unreachable.disconnect()
		expect(health.status).toBe("down")
		expect(health.error).toEqual(expect.any(String))
	}, 20_000)
})
