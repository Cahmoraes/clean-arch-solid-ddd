import { afterEach, describe, expect, it } from "vitest"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { env } from "@/shared/infra/env"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"
import { initializeMongo } from "./initialize-mongo"

describe("initializeMongo", () => {
	const opened: MongoConnection[] = []

	afterEach(async () => {
		await Promise.all(
			opened.splice(0).map((connection) => connection.disconnect()),
		)
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
