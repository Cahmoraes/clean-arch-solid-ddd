import { describe, expect, it, vi } from "vitest"
import { initializeMongo } from "./initialize-mongo"
import { MongoConnection } from "./mongo-connection"

function failingConnection(startupFailure: unknown, closeFailure: Error) {
	const connection = new MongoConnection("mongodb://127.0.0.1:1/test")
	vi.spyOn(connection, "connect").mockRejectedValue(startupFailure)
	vi.spyOn(connection, "disconnect").mockRejectedValue(closeFailure)
	return connection
}

function collectErrors(error: unknown): unknown[] {
	if (!(error instanceof Error)) return [error]
	const children =
		error instanceof AggregateError ? error.errors : [error.cause]
	return [error, ...children.flatMap(collectErrors)]
}

describe("initializeMongo close failure", () => {
	it("never loses the close error when the startup error is not an Error", async () => {
		const closeFailure = new Error("close failed")

		const error = await initializeMongo(
			failingConnection("startup string failure", closeFailure),
		).catch((caught: unknown) => caught)

		expect(collectErrors(error)).toContain(closeFailure)
		expect(collectErrors(error)).toContain("startup string failure")
	})

	it("never loses the close error when the cause chain ends in a non-Error cause", async () => {
		const closeFailure = new Error("close failed")
		const startupFailure = new Error("startup", { cause: "raw cause" })

		const error = await initializeMongo(
			failingConnection(startupFailure, closeFailure),
		).catch((caught: unknown) => caught)

		expect(collectErrors(error)).toContain(closeFailure)
		expect(collectErrors(error)).toContain(startupFailure)
		expect(collectErrors(error)).toContain("raw cause")
	})
})
