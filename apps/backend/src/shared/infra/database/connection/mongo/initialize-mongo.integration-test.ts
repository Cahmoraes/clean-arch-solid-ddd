import { afterEach, describe, expect, it, vi } from "vitest"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { env } from "@/shared/infra/env"
import { MongoTransactionsUnsupportedError } from "@/shared/infra/errors/mongo-transactions-unsupported-error"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"
import { initializeMongo } from "./initialize-mongo"

const STANDALONE_URL =
	process.env.DATABASE_URL_MONGO_STANDALONE ??
	"mongodb://127.0.0.1:27018/test?directConnection=true"

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

	it("AC-05: rejects with MongoTransactionsUnsupportedError on a standalone MongoDB and closes the client", async () => {
		const connection = new MongoConnection(STANDALONE_URL)
		const disconnect = vi.spyOn(connection, "disconnect")

		const error = await initializeMongo(connection).catch(
			(caught: unknown) => caught,
		)

		expect(error).toBeInstanceOf(MongoTransactionsUnsupportedError)
		expect(disconnect).toHaveBeenCalledOnce()
	}, 20_000)

	it("keeps the original startup error, with the disconnect failure as its cause, when closing the client also fails", async () => {
		const connection = new MongoConnection(STANDALONE_URL)
		const closeFailure = new Error("close failed")
		vi.spyOn(connection, "disconnect").mockRejectedValue(closeFailure)

		const error = await initializeMongo(connection).catch(
			(caught: unknown) => caught,
		)

		expect(error).toBeInstanceOf(MongoTransactionsUnsupportedError)
		if (!(error instanceof Error)) throw error
		expect(error.cause).toBe(closeFailure)
		await connection.client().close()
	}, 20_000)
})
