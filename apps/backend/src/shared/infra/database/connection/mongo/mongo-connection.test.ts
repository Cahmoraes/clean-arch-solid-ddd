import { describe, expect, it } from "vitest"
import { supportsTransactions } from "./mongo-connection"

describe("supportsTransactions", () => {
	it("accepts a replica set member", () => {
		expect(
			supportsTransactions({ setName: "rs0", isWritablePrimary: true }),
		).toBe(true)
	})

	it("accepts a mongos router", () => {
		expect(supportsTransactions({ msg: "isdbgrid" })).toBe(true)
	})

	it("rejects a standalone server", () => {
		expect(supportsTransactions({ isWritablePrimary: true })).toBe(false)
	})
})
